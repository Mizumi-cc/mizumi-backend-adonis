import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { getAllBanks } from "App/Services/Paybox";

export default class BankLookupController {
  public async fetchAllBanks({request, response}: HttpContextContract) {
    let banks = await getAllBanks()
      .then((res) => {
        if (res.status === 200) {
          return res.data
        } else {
          return []
        }
      })
    banks = banks.filter((bank: any) => bank.short_name !== 'MTN' 
      || bank.short_name !== 'AIRTELTIGO' 
      || bank.short_name !== 'VODAFONE'
    )
    return response.json(banks)
  }
}
