import {PuppeteerHandler} from './puppeteerFunc.js'
import fs from 'fs'
import path from 'path'

// Multithreading init -----------------
const p = new PuppeteerHandler()

export class Scrapper {
    constructor(arrayOfAccs, tgApi, chatId) {
        this.currArrayOfAccs = arrayOfAccs

        this.timerInterval = null
        this.timer = 3 * (60 * 1000)

        this.tgApi = tgApi
        this.chatId = chatId
    }

    setchatId(id) {
        this.chatId = id
    }

    options(acc) {
        return {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Удалить из списка', callback_data: `/delete-${acc}`}]
                ]
            })
        }
    }

	async startScrapping(accs) {
        if (this.chatId) {
            if (this.timerInterval) {
                clearInterval(this.timerInterval)
            }
    
            p.closeBrowser()
    
            if (accs) {
                this.currArrayOfAccs = accs
            }
            
            await this.multithreadingPages()
        }
	}

    async multithreadingPages() {
        try {
    
            
            this.timerInterval = setInterval(async () => {
                const listOfAccsInf = await p.getPagesContent(this.currArrayOfAccs)

                this.getAccountsInfo(listOfAccsInf)

                console.log('Done----')
            }, this.timer)


        } catch (e) {
            throw e
        }
    }

    getAccountsInfo(list) {
        const accsInfs = JSON.parse(fs.readFileSync(path.resolve() + '/helpers/existedLinks.json'))

        const postLinks = []
        
        list.forEach(inf => {
            const userN = inf.userAcc
            
            if (!accsInfs[userN] && inf.links.length) {
                accsInfs[userN] = [...inf.links]
                postLinks.push({name: inf.textAcc, url: inf.url, useracc: inf.userAcc, unlinks: [...inf.links]})
            } else if (inf.links.length) {
                const unexistedAccs = inf.links.filter(i => !accsInfs[userN].find(accLink => accLink == i))
                
                if (unexistedAccs.length) {
                    accsInfs[userN] = [...accsInfs[userN], ...unexistedAccs]
                    postLinks.push({name: inf.textAcc, url: inf.url, useracc: inf.userAcc, unlinks: unexistedAccs})
                }
            }
        })
        
        if (postLinks.length) {
            fs.writeFileSync(path.resolve() + '/helpers/existedLinks.json', JSON.stringify(accsInfs))

            postLinks.forEach(i => {
                const linksArr = i.unlinks.join('\n')
                this.tgApi.sendMessage(this.chatId, `Новые ссылки с ${i.name} (${i.url}):\n\n ${linksArr}`, this.options(i.useracc))
            })
        }
    }
}


// --------------------------------------
