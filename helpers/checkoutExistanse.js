import {getPageContent} from './puppeteerFunc.js'

import cherio from 'cheerio'

export async function checkoutExistanse(twitterAcc) {
    const checkoutPage = await getPageContent(twitterAcc)
    const $ = cherio.load(checkoutPage)

    const d = $('.r-1kihuf0.r-14lw9ot').data('testid')
    const b = $('div[data-testid="error-detail"]').data('testid')
    
    return d == 'emptyState' || b == 'error-detail'
}