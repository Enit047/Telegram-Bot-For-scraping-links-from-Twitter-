import puppeteer from 'puppeteer'
import { Cluster } from 'puppeteer-cluster'
import cherio from 'cheerio'
import { scrollPageToBottom } from 'puppeteer-autoscroll-down'
import userAgent from 'user-agents';

export const LAUNCH_PUPPETEER_OPTS = {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
}
  
export const PAGE_PUPPETEER_OPTS = {
    networkIdle2Timeout: 10000,
    waitUntil: 'networkidle2',
    timeout: 3000000
}

let website = 'https://twitter.com/'

export async function getPageContent(twitterAcc) {
    try {
        const account = website + twitterAcc

        const browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS)
        const page = await browser.newPage()

        await page.setUserAgent(userAgent.toString())
        
        await page.goto(account, PAGE_PUPPETEER_OPTS)

        const contentPage = await page.content()
        browser.close()

        return contentPage
    } catch (e) {
        throw e
    }
}


export class PuppeteerHandler{
    constructor() {
        this.cluster = null
    }
    async initCluster() {
        this.cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_PAGE,
            maxConcurrency: 7,
            puppeteerOptions: PAGE_PUPPETEER_OPTS
        })
    }
    closeBrowser() {
        if (this.cluster) {
            this.cluster.close()
            this.cluster = null
        }
    }
    async getPagesContent(twitterAccs) {
        if (!this.cluster) {
            await this.initCluster()
        }
        
        try {

            const arrOfInfsAccs = []
        
            this.cluster.on('taskerror', (err, data) => {
                console.log(`Error crawling: ${data}: ${err}`)
            })
            
            await this.cluster.task(async ({ page, data: url }) => {

                await page.setUserAgent(userAgent.toString())

                await page.goto(url, PAGE_PUPPETEER_OPTS)

                await page.waitForSelector('section')

                await scrollPageToBottom(page, { size: 100, delay: 50})
                
                const contentPage = await page.content()

                arrOfInfsAccs.push(this.pagesHandler(contentPage, url))
            })
            
            for(const acc of twitterAccs) {
                this.cluster.queue(website + acc)
            }

            await this.cluster.idle()
            await this.cluster.close()

            return arrOfInfsAccs
        } catch (e) {
            throw e
        }
    }

    pagesHandler(pageLoaded, url) {
        const $ = cherio.load(pageLoaded)

        const links = []
        const linksClass = 'a.css-4rbku5.css-18t94o4.css-901oao.css-16my406.r-1cvl2hr.r-1loqt21.r-poiln3.r-bcqeeo.r-qvutc0'
        
        $('.css-1dbjc4n.r-1ifxtd0.r-ymttw5.r-ttdzmv').find(linksClass).each((i, elem) => links.push($(elem).attr('href')))
        $('div[data-testid="cellInnerDiv"]').each((i, elem) => {
            const text = $(elem).find('.css-1dbjc4n.r-j5o65s.r-qklmqi.r-1adg3ll.r-1ny4l3l')
            const textRetw = text.find('.css-901oao.css-16my406.css-cens5h.r-14j79pv.r-poiln3.r-n6v787.r-b88u0q.r-1cwl3u0.r-bcqeeo.r-qvutc0').text()

            if (!textRetw.toLowerCase().includes('ретвитнул') || !textRetw.toLowerCase().includes('retweeted')) {
                text.find(linksClass).each((i, elem) => links.push($(elem).attr('href')))
            }
        })
        const textAcc = $('div[data-testid="UserName"]').find('div[dir="auto"]').find('.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0').find('.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0').text()
        
        const userAcc = url.split('https://twitter.com/')[1]

        const filterFirst = links.filter(i => i.includes('http'))
        const filterSec = [...new Set(filterFirst)]
        
        return {
            textAcc, 
            url,
            userAcc,
            links: filterSec
        }
    }
}


// (async function asyncClaster(currArrayOfAccs) {
//     console.log('first')
//     const cluster = await Cluster.launch({
//         concurrency: Cluster.CONCURRENCY_PAGE,
//         maxConcurrency: 2,
//         puppeteer: LAUNCH_PUPPETEER_OPTS
//     });
    
//     await cluster.task(async ({ page, data: url }) => {
//         console.log(url)
//         await page.goto(url, PAGE_PUPPETEER_OPTS)

//         const contentPage = await page.content()

//         console.log('ready')
//     });
    
    
//     cluster.queue('http://www.google.com/')
    
    
//     await cluster.idle()
//     await cluster.close()
// })()