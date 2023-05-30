const axios = require('axios');

export const getForexRates = async (symbols: string) => {
  const url = `${process.env.RATES_API_URL}/latest?base=USD&symbols=${symbols}`
  const response = await axios.get(
    url,
    {
      headers: {
        'apikey': process.env.RATES_API_KEY
      }
    }
  )
  return response.data.rates.GHS
}

