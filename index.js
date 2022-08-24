import TelegramApiBot from 'node-telegram-bot-api'
import fs from 'fs'

import {checkoutExistanse} from './helpers/checkoutExistanse.js'
import {Scrapper} from './helpers/queueTasker.js'


import jsonAuth from './auth.json' assert {type: "json"}
import accsTw from './activeTwitterAccs.json' assert {type: "json"}


let arrayOfAccs = [...accsTw.accs]

const botTG = new TelegramApiBot(jsonAuth.TGBotToken, {polling: true})


const scrapper = new Scrapper(arrayOfAccs, botTG, jsonAuth.chatId)
scrapper.startScrapping()


botTG.setMyCommands([
    {command: '/start', description: 'Приветствие  и основная информация.'},
    {command: '/list', description: 'Список текущих аккаунтов, на которые вы подписаны.'}
])

botTG.on('message', async (msg) => {
    const msgText = msg.text
    
    const chatId = msg.chat.id

    if (msgText == '/start') {
        // Save chatId locally ----------------------------------------
        const newAuthJson = {
            ...jsonAuth,
            chatId
        }
        fs.writeFileSync('./auth.json', JSON.stringify(newAuthJson))
        scrapper.setchatId(chatId)
        // ------------------------------------------------------------

        botTG.sendMessage(chatId, '🧑‍💻Привет, это твой личный бот по мониторингу твиттер аккаунтов\n\n\n✏️Для того чтобы отправит мне твиттер страницу(для мониторинга), пришли мне ник и припиши к нему вначале: /add-\n\nПример: /add-elonmusk\n\n✏️Для просмотра подключённых аккаунтов напиши: /list\n\n\nБот отвечает в течении 10 секунд, в зависимости от количества аккаунтов.\n\n\n⚠️Небольшая ремарка: Мне пока не совсем понятно, какой предел у этого софта с данной конфигурацией, поэтому, настоятельно прошу, не ставить больше 40 акков. По всем вопросам прошу к моему шалашу @Enit047')
    } else if (msgText.includes('/add-') && msgText.replace(/\/add-/, '')) {
        const twitterAcc = msgText.replace(/\/add-/, '')

        const alreadyHaveAcc = arrayOfAccs.find(acc => acc == twitterAcc)
        
        if (alreadyHaveAcc) {
            botTG.sendMessage(chatId, `⚠️Аккаунт (${twitterAcc}) уже был добавлен до этого`)
        } else if (arrayOfAccs.length >= 40) {
            botTG.sendMessage(chatId, `⚠️Эй, погоди, дружочек, лимит подключённых аккаунтов был достигнут! Максимальное количество это 25 аккаунтов.`)
        } else {

            const existPage = await checkoutExistanse(twitterAcc)

            if (existPage) {
                botTG.sendMessage(chatId, `❌ Что то не так с (${twitterAcc}). Пожалуйста перепроверьте twitter username!`)
            } else {
                arrayOfAccs.push(twitterAcc)
            
                const newTwitterLinks = {
                    accs: arrayOfAccs
                }
                
                fs.writeFileSync('./activeTwitterAccs.json', JSON.stringify(newTwitterLinks))

                botTG.sendMessage(chatId, `✅Аккаунт (${twitterAcc}) успешно добавлен`)
                
                // max amount

                // Restart with new params --------------------------------------------------
                scrapper.startScrapping(arrayOfAccs)
                // --------------------------------------------------------------------------
            }
        }
    } else if(msgText == '/list') {
        const strText = `📋Список текущих твиттер аккаунтов (${arrayOfAccs.length}):\n\n\n`
        let newlist
        if (arrayOfAccs.length) {
            newlist = arrayOfAccs.map(acc => acc + '\n\n').join('')
        } else {
            newlist = 'ПУСТО'
        }
        botTG.sendMessage(chatId, strText + newlist)
    } else if (msgText.includes('/delete-')) {
        deleteB(chatId, msgText)
    }
})

botTG.on('callback_query', msg => {
    const chatId = msg.message.chat.id
    const data = msg.data

    if (data.includes('/delete-')) {
        deleteB(chatId, data)
    }
})


function deleteB(id, msgText) {
    const twitterAccDel = msgText.replace(/\/delete-/, '')
        
    arrayOfAccs = arrayOfAccs.filter(acc => acc !== twitterAccDel)

    const newTwitterLinks = {
        accs: arrayOfAccs
    }

    fs.writeFileSync('./activeTwitterAccs.json', JSON.stringify(newTwitterLinks))
    
    botTG.sendMessage(id, `❗️Аккаунт: ${twitterAccDel} был удалён`)

    // Restart with new params --------------------------------------------------
    scrapper.startScrapping(arrayOfAccs)
    // --------------------------------------------------------------------------
}