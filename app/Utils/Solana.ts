import { getAssociatedTokenAddressSync, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  Account, 
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidMintError,
  TokenInvalidOwnerError,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token"
import { Signer, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js"
export const getOrCreateAssociatedTokenAccount = async (
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean,
) => {
  const associatedToken = getAssociatedTokenAddressSync(
    mint,
    owner,
    allowOwnerOffCurve,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  let account: Account;

  try {
    account = await getAccount(connection, associatedToken)
  } catch (error: any) {
    console.log(error, 'error')
    if (error.type === "TokenAccountNotFoundError" || error.type === "TokenInvalidAccountOwnerError") {
      try {
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedToken,
            owner,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );

        await sendAndConfirmTransaction(connection, transaction, [payer])
      } catch (error) {
        
      }
      account = await getAccount(connection, associatedToken, 'confirmed', TOKEN_PROGRAM_ID);

    } else {
      throw error;
    }
  }
  if (!account.mint.equals(mint)) throw new TokenInvalidMintError();
  if (!account.owner.equals(owner)) throw new TokenInvalidOwnerError();

  return account;
}