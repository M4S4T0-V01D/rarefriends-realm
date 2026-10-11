// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * RareFriends Realm: the Adventurer Cards. One collection, one contract; every card a one-of-one ERC-721 that stands
 * for a snapshot of a Realm character's progress (XP, eligible items), held by the game's save service in escrow.
 *
 * Minting is by voucher: the save service (the MINTER role's key, kept as a Worker secret) signs an EIP-712 voucher
 * naming the player's wallet, the card, the character it is for and the snapshot it commits to; the player submits it
 * and pays the gas. The contract only mints what the service signed, once, and holds one active card per character
 * at a time. Burning a card (redeeming it) is the holder's act; the service watches for the burn and settles the
 * progress in the game. Nothing on chain ever concerns a Friend itself: a card carries Realm progress only.
 *
 * Roles: DEFAULT_ADMIN (the project's wallet: metadata base, royalties, roles), MINTER (the service's signing key).
 * Royalties (ERC-2981) go to the treasury the admin sets. Metadata is served by the service at the base URI.
 */
contract AdventurerCards is ERC721, ERC2981, AccessControl, EIP712 {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("CardVoucher(address to,uint256 tokenId,bytes32 character,bytes32 snapshot,uint256 deadline)");

    /** What a card commits to: the keccak-256 of its snapshot (the service holds the snapshot itself). */
    mapping(uint256 tokenId => bytes32) public snapshotOf;
    /** The character (a key the service derives; never a Friend's own identity) a card was minted for. */
    mapping(uint256 tokenId => bytes32) public characterOf;
    /** The one active card of a character, or 0 when it has none (so a character can't have two cards out at once). */
    mapping(bytes32 character => uint256) public activeCardOf;
    /** Cards burned (redeemed), kept so the service can settle a redemption it missed while it was down. */
    mapping(uint256 tokenId => address) public redeemedBy;

    string private _base;
    uint256 public minted;

    event CardMinted(uint256 indexed tokenId, address indexed to, bytes32 indexed character, bytes32 snapshot);
    event CardRedeemed(uint256 indexed tokenId, address indexed by, bytes32 indexed character, bytes32 snapshot);

    error VoucherExpired();
    error VoucherNotForYou();
    error BadVoucher();
    error AlreadyMinted();
    error CharacterHasACard();
    error NotTheHolder();

    constructor(address admin, address minter, address royaltyReceiver, uint96 royaltyBps, string memory baseURI)
        ERC721("RareFriends Realm", "RFRC")
        EIP712("RareFriends Realm Adventurer Cards", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
        _base = baseURI;
    }

    // ---------- Minting by voucher ----------

    /** The digest a MINTER signs for a voucher (so the service and a test agree on it). */
    function voucherDigest(address to, uint256 tokenId, bytes32 character, bytes32 snapshot, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, to, tokenId, character, snapshot, deadline)));
    }

    /** Mint the card the voucher names, to the caller it names. Once per token, one active card per character. */
    function mint(uint256 tokenId, bytes32 character, bytes32 snapshot, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert VoucherExpired();
        if (tokenId == 0 || _ownerOf(tokenId) != address(0) || redeemedBy[tokenId] != address(0)) revert AlreadyMinted();
        if (activeCardOf[character] != 0) revert CharacterHasACard();
        address signer = ECDSA.recover(voucherDigest(msg.sender, tokenId, character, snapshot, deadline), signature);
        if (!hasRole(MINTER_ROLE, signer)) revert BadVoucher();
        snapshotOf[tokenId] = snapshot;
        characterOf[tokenId] = character;
        activeCardOf[character] = tokenId;
        minted += 1;
        _safeMint(msg.sender, tokenId);
        emit CardMinted(tokenId, msg.sender, character, snapshot);
    }

    // ---------- Redeeming ----------

    /** Burn a card you hold: the service sees the event and settles its progress onto your character. */
    function redeem(uint256 tokenId) external {
        if (_ownerOf(tokenId) != msg.sender) revert NotTheHolder();
        bytes32 character = characterOf[tokenId];
        redeemedBy[tokenId] = msg.sender;
        if (activeCardOf[character] == tokenId) activeCardOf[character] = 0;
        _burn(tokenId);
        emit CardRedeemed(tokenId, msg.sender, character, snapshotOf[tokenId]);
    }

    // ---------- Metadata and royalties ----------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_base, tokenId.toString());
    }
    function setBaseURI(string calldata baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) { _base = baseURI; }
    function setRoyalty(address receiver, uint96 bps) external onlyRole(DEFAULT_ADMIN_ROLE) { _setDefaultRoyalty(receiver, bps); }
    /** OpenSea's collection-level metadata (name, image, links): the service serves it at the base URI's root. */
    function contractURI() external view returns (string memory) { return string.concat(_base, "collection"); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
