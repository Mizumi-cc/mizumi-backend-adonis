import Auth from 'App/Models/Auth'
import Config from '@ioc:Adonis/Core/Config'
import {randomBytes} from 'node:crypto'
import QRCode from 'qrcode'
const twoFactor = require('node-2fa')

class TwoFactorAuthProvider {
  private issuer = Config.get('twoFactorAuth.app.name') || 'Mizumi'

  public generateSecret(user: Auth) {
    const secret = twoFactor.generateSecret({ 
      name: this.issuer, 
      account: user.email 
    })
    return secret.secret 
  }

  public async generateRecoveryCodes() {
    const recoveryCodeLimit: number = 8
    const codes: string[] = []
    for (let i = 0; i < recoveryCodeLimit; i++) {
      const recoveryCode: string = `${await this.secureRandomString()}-${await this.secureRandomString()}`
      codes.push(recoveryCode)
    }
    return codes
  }

  public async secureRandomString() {
    return randomBytes(10).toString('hex').slice(0, 10)
  }

  public async generateQrCode(user: Auth) {
    const appName = encodeURIComponent(this.issuer)
    const userName = encodeURIComponent(user.email)
    const query = `?secret=${user.twoFactorSecret}&issuer=${appName}`
    const url = `otpauth://totp/${appName}:${userName}${query}`
    const svg = await QRCode.toDataURL(url)
    return { secret: user.twoFactorSecret, svg }
  }
}

export default new TwoFactorAuthProvider()
