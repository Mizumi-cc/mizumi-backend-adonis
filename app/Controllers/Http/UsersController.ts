import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import User from "App/Models/User";

export default class UsersController {
  public async signup({ request, response }: HttpContextContract) {
    const { walletAddress } = request.all();
    const user = await User.create({ walletAddress });
    return response.json(user);
  }

  public async updateUserInformation({
    request,
    response,
  }: HttpContextContract) {
    const { walletAddress, kycFields, paymentDetails } = request.all();
    const user = await User.findByOrFail("walletAddress", walletAddress);
    user.kycFields = kycFields;
    user.paymentDetails = paymentDetails;
    await user.save();
    return response.json(user);
  }
}
