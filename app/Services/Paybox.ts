import axios from 'axios'
import { PAYBOXMODE } from 'App/Models/Enums'

export interface IChargeBankCard {
  order_id: string
  currency: 'GHS' | 'USD'
  amount: string
  mode: PAYBOXMODE
  card_first_name: string
  card_last_name: string
  card_number: string
  card_expiry: string
  card_cvc: string
  card_country: string
  card_address: string
  card_city: string
  card_state: string
  card_zip: string
  card_email: string  
}

export interface ITransfer {
  order_id: string
  currency: 'GHS' | 'USD'
  amount: string
  mode: PAYBOXMODE
  mobile_network?: string
  mobile_number?: string
  bank_code?: string
  bank_account?: string
}

export const createPaymentLink = async (data: IChargeBankCard) => {
  return await axios.post(
    `${process.env.PAYBOX_URL}/pay`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYBOX_COLLECTION_KEY}`
      }
    }
  )
}

export const transfer = async (data: ITransfer) => {
  return await axios.post(
    `${process.env.PAYBOX_URL}/transfer`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYBOX_TRANSFER_KEY}`
      }
    }
  )
}

export const getAllBanks = async () => {
  return await axios.get(
    `${process.env.PAYBOX_URL}/settlement_accounts`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYBOX_TRANSFER_KEY}`
      }
    }
  )
}
