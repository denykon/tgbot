import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';

const INITIAL_SESSION = {
  messages: []
};

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Жду Ваше сообщение');
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Жду Ваше сообщение');
});

// bot.on(message('text'), async (ctx) => {
//   await ctx.reply(JSON.stringify(ctx.message, null, 2))
// });

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;

  try {
    const userId = ctx.message.from.id;
    const fileId = ctx.message.voice.file_id;

    ctx.reply(code('Сообщение принял...'));

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const oggPath = await ogg.create(fileLink, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);

    ctx.session.messages.push({role: openai.roles.USER, content: text});
    const response = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});

    await ctx.reply(response.content);
    // ctx.reply(JSON.stringify(fileLink, null, 2))
  } catch (e) {

  }

});

bot.on(message('text'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;

  try {
    ctx.reply(code('Сообщение принял...'));

    const text = ctx.message.text;

    ctx.session.messages.push({role: openai.roles.USER, content: text});
    const response = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});

    await ctx.reply(response.content);
    // ctx.reply(JSON.stringify(fileLink, null, 2))
  } catch (e) {

  }

});

bot.command('start', async (ctx) => {
  await ctx.reply(JSON.stringify(ctx.message, null, 2));
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
