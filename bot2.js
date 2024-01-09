/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * supports messages and callback queries (inline button presses)
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
  if ('callback_query' in update) {
    await onCallbackQuery(update.callback_query)
  }
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Send text message formatted with MarkdownV2-style
 * Keep in mind that any markdown characters _*[]()~`>#+-=|{}.! that
 * are not part of your formatting must be escaped. Incorrectly escaped
 * messages will not be sent. See escapeMarkdown()
 * https://core.telegram.org/bots/api#sendmessage
 */
// Update sendMarkdownV2Text to include buttons
async function sendMarkdownV2Text(chatId, text, buttons) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'MarkdownV2',
    reply_markup: JSON.stringify({
      inline_keyboard: buttons
    })
  }))).json();
}
/**
 * Escape string for use in MarkdownV2-style text
 * if `except` is provided, it should be a string of characters to not escape
 * https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdown (str, except = '') {
  const all = '_*[]()~`>#+-=|{}.!\\'.split('').filter(c => !except.includes(c))
  const regExSpecial = '^$*+?.()|{}[]\\'
  const regEx = new RegExp('[' + all.map(c => (regExSpecial.includes(c) ? '\\' + c : c)).join('') + ']', 'gim')
  return str.replace(regEx, '\\$&')
}

/**
 * Send a message with a single button
 * `button` must be an button-object like `{ text: 'Button', callback_data: 'data'}`
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendInlineButton (chatId, text, button) {
  return sendInlineButtonRow(chatId, text, [button])
}

/**
 * Send a message with buttons, `buttonRow` must be an array of button objects
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendInlineButtonRow (chatId, text, buttonRow) {
  return sendInlineButtons(chatId, text, [buttonRow])
}


/**
 * Answer callback query (inline button press)
 * This stops the loading indicator on the button and optionally shows a message
 * https://core.telegram.org/bots/api#answercallbackquery
 */
async function answerCallbackQuery (callbackQueryId, text = null) {
  const data = {
    callback_query_id: callbackQueryId
  }
  if (text) {
    data.text = text
  }
  return (await fetch(apiUrl('answerCallbackQuery', data))).json()
}

/**
 * Handle incoming callback_query (inline button press)
 * https://core.telegram.org/bots/api#message
 */
async function onCallbackQuery(callbackQuery) {
    if (callbackQuery.data === 'play_dicestone') {
      // Directly launch the game when "Play Dice Stone" is clicked
      await launchGame(callbackQuery.message.chat.id);
    } else if (callbackQuery.data === 'get_score') {
      // Handle "Get Score" action
      await getScore(callbackQuery.message.chat.id, callbackQuery.from.username); // Or use some other user identifier
      // Send acknowledgment for the "Get Score" button
      await answerCallbackQuery(callbackQuery.id, 'Fetching your score...');
    } else if (callbackQuery.data === 'create_wallet') {
    // Handle "Get Score" action
    await createWallet(callbackQuery.message.chat.id, callbackQuery.from.username); // Or use some other user identifier
    // Send acknowledgment for the "Get Score" button
    await answerCallbackQuery(callbackQuery.id, 'Fetching your score...');
    } else {
      // Handle other callback queries and send acknowledgment
      await sendMarkdownV2Text(callbackQuery.message.chat.id, escapeMarkdown(`You pressed the button with data=\`${callbackQuery.data}\``, '`'));
      await answerCallbackQuery(callbackQuery.id, 'Button press acknowledged!');
    }
  }
  
/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
function onMessage(message) {
  const username = message.from.username || message.from.first_name || 'there';

  if (message.text.startsWith('/start')) {
    return sendStartButtons(message.chat.id, username);
  } else if (message.text.startsWith('/help')) {
    return sendMarkdownV2Text(message.chat.id, '*Functions:*\n' +
      escapeMarkdown(
        '`/help` - This message\n' +
        '/get_score - Sends a message with the user\'s score\n' +
        '/play_dice_stone - Sends a message with four buttons\n' +
        '/button4 - Sends a message with four buttons\n' +
        '/markdown - Sends some MarkdownV2 examples\n',
        '`'))
  } else if (message.text.startsWith('/get_score')) {
    return getScore(message.chat.id, username)
  } else if (message.text.startsWith('/create_wallet')) {
      return createWallet(message.chat.id, username)
  } else if (message.text.startsWith('/play_dice_stone')) {
    return sendGameLinks(message.chat.id)
  } else if (message.text.startsWith('/markdown')) {
    return sendMarkdownExample(message.chat.id)
  } else {
    return sendMarkdownV2Text(message.chat.id, escapeMarkdown('*Unknown command:* `' + message.text + '`\n' +
      'Use /help to see available commands.', '*`'))
  }
}

/**
 * Send a message with 'Get Score' and 'Play Dice Stone' buttons
 * @param {string} chatId - Chat ID of the Telegram user
 * @param {string} username - Username of the Telegram user
 */
function sendStartButtons(chatId, username) {
  const gameUrl = 'https://telegram.knuckle.pages.dev/';
  const buttons = [
    [{ text: 'Get Score', callback_data: 'get_score' }],
    [{ text: 'Play Dice Stone', web_app: { url: gameUrl } }],
    [{ text: 'Create a Dice Stone Wallet', callback_data: 'create_wallet' }],
  ];

  const text = `👋🏻 Welcome to Dice Stone @${username}\n\n` +
                `*Overview:*\n\n` +
                `__Chains Linked:__\n` +
                `None`;

  return sendInlineButtons(chatId, text, buttons); // Updated to sendInlineButtons
}
  /**
 * Send an image to the chat
 * @param {string} chatId - Chat ID of the Telegram user
 */
async function sendImage(chatId) {
  const imageUrl = 'https://miro.medium.com/v2/resize:fit:786/format:webp/1*aHCD1PT-HGQrc5NmOEjPrQ.jpeg';
  return (await fetch(apiUrl('sendPhoto', {
    chat_id: chatId,
    photo: imageUrl
  }))).json();
}
  /**
   * Send a message with buttons, `buttons` must be an array of arrays of button objects
   * https://core.telegram.org/bots/api#sendmessage
   */
  async function sendInlineButtons(chatId, text, buttons) {
    return (await fetch(apiUrl('sendMessage', {
      chat_id: chatId,
      text: text,
      reply_markup: JSON.stringify({
        inline_keyboard: buttons
      })
    }))).json();
  }

  
/**
 * Fetch the user's score from an external API
 * @param {string} chatId - Chat ID of the Telegram user
 * @param {string} username - Telegram username of the user
 */
async function createWallet(chatId, username) {
  const url = 'https://leelabot.app/api/create-or-get';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({ username: username });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    wallet = data.wallet.address;
    passkey = data.wallet.passkey;
    // Assuming the API returns the score in a property called 'score'
    return sendPlainText(chatId, `Your Wallet is: ${wallet}\nYour Private Key is: ${passkey}`);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return sendPlainText(chatId, `Sorry, there was an error creating your wallet. ${error}`)
  }
}
function sendGameLinks(chatId) {
  return sendInlineButtons(chatId, 'Choose an action', [
    [{
      text: 'Play Dicestone',
      callback_data: 'play_dicestone' // Specific callback data for the game button
    }]
  ]);
}


/**
 * Fetch the user's score from an external API
 * @param {string} chatId - Chat ID of the Telegram user
 * @param {string} username - Telegram username of the user
 */
async function getScore(chatId, username) {
  const url = 'https://leelabot.app/api/get-silver';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({ username: username });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Assuming the API returns the score in a property called 'score'
    const score = data.result.user_silver;
    return sendPlainText(chatId, `Your score is: ${score}`);
  } catch (error) {
    return sendPlainText(chatId, `Sorry, you haven't registered yet. Play a game and click connect on top to register.`)
  }
}


async function sendMarkdownExample (chatId) {
  await sendMarkdownV2Text(chatId, 'This is *bold* and this is _italic_')
  await sendMarkdownV2Text(chatId, escapeMarkdown('You can write it like this: *bold* and _italic_'))
  return sendMarkdownV2Text(chatId, escapeMarkdown('...but users may write ** and __ e.g. `**bold**` and `__italic__`', '`'))
}
