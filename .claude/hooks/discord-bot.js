/**
 * Discord Bot for Claude Code Permission Approvals
 *
 * Watches for permission requests and sends interactive Discord messages
 * with Approve/Reject buttons.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=your_token npm start
 */

import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import chokidar from 'chokidar';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load config
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));

const REQUESTS_DIR = join(__dirname, 'requests');
const RESPONSES_DIR = join(__dirname, 'responses');

// Pending requests map: requestId -> { message, timeout }
const pendingRequests = new Map();

// Tool descriptions for better readability
const TOOL_DESCRIPTIONS = {
  Bash: 'Shell command execution',
  Read: 'File read',
  Write: 'File write',
  Edit: 'File edit',
  Glob: 'File search',
  Grep: 'Content search',
  Task: 'Agent task',
  WebFetch: 'Web request',
  WebSearch: 'Web search',
};

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

/**
 * Format tool input for display
 */
function formatToolInput(toolName, toolInput) {
  if (!toolInput) return 'No input';

  switch (toolName) {
    case 'Bash':
      return `\`\`\`bash\n${toolInput.command?.slice(0, 500) || 'N/A'}\n\`\`\``;
    case 'Read':
      return `\`${toolInput.file_path || 'N/A'}\``;
    case 'Write':
      return `\`${toolInput.file_path || 'N/A'}\`\n(${toolInput.content?.length || 0} chars)`;
    case 'Edit':
      return `\`${toolInput.file_path || 'N/A'}\``;
    case 'Glob':
      return `Pattern: \`${toolInput.pattern || 'N/A'}\``;
    case 'Grep':
      return `Pattern: \`${toolInput.pattern || 'N/A'}\``;
    case 'Task':
      return `${toolInput.description || 'N/A'}\nAgent: ${toolInput.subagent_type || 'N/A'}`;
    case 'WebFetch':
      return `\`${toolInput.url || 'N/A'}\``;
    case 'WebSearch':
      return `\`${toolInput.query || 'N/A'}\``;
    default:
      return JSON.stringify(toolInput, null, 2).slice(0, 500);
  }
}

/**
 * Get color based on tool type
 */
function getToolColor(toolName) {
  const colors = {
    Bash: 0xff6b6b,     // Red - potentially dangerous
    Write: 0xffa94d,    // Orange - file modification
    Edit: 0xffa94d,     // Orange - file modification
    Read: 0x69db7c,     // Green - safe read
    Glob: 0x69db7c,     // Green - safe search
    Grep: 0x69db7c,     // Green - safe search
    Task: 0x748ffc,     // Blue - agent task
    WebFetch: 0xcc5de8, // Purple - external
    WebSearch: 0xcc5de8,// Purple - external
  };
  return colors[toolName] || 0x868e96;
}

/**
 * Process new permission request
 */
async function processRequest(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const request = JSON.parse(content);

    const { request_id, tool_name, tool_input, cwd } = request;

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`Claude Code Permission Request`)
      .setDescription(`**Tool:** ${tool_name} (${TOOL_DESCRIPTIONS[tool_name] || 'Unknown'})`)
      .setColor(getToolColor(tool_name))
      .addFields(
        { name: 'Project', value: cwd?.split('/').pop() || 'Unknown', inline: true },
        { name: 'Request ID', value: `\`${request_id.slice(0, 20)}...\``, inline: true },
        { name: 'Input', value: formatToolInput(tool_name, tool_input).slice(0, 1024) }
      )
      .setTimestamp()
      .setFooter({ text: 'Reply within 5 minutes' });

    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_${request_id}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`reject_${request_id}`)
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`reply_${request_id}`)
          .setLabel('Reply')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💬'),
        new ButtonBuilder()
          .setCustomId(`approve_always_${request_id}`)
          .setLabel('Always Allow')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔓'),
      );

    // Send message
    const channel = await client.channels.fetch(config.channelId);
    const message = await channel.send({ embeds: [embed], components: [row] });

    // Store pending request with timeout
    const timeoutId = setTimeout(() => {
      handleTimeout(request_id, message);
    }, (config.timeoutSeconds || 300) * 1000);

    pendingRequests.set(request_id, { message, timeoutId, filePath });

    console.log(`[${new Date().toISOString()}] Sent request: ${tool_name} - ${request_id}`);

  } catch (err) {
    console.error('Error processing request:', err);
  }
}

/**
 * Handle button interaction
 */
async function handleInteraction(interaction) {
  // Handle Modal Submit (Reply with message)
  if (interaction.isModalSubmit()) {
    const [, ...idParts] = interaction.customId.split('_');
    const requestId = idParts.join('_');

    const pending = pendingRequests.get(requestId);
    if (!pending) {
      await interaction.reply({ content: 'Request expired or already handled.', flags: 64 });
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeoutId);

    // Get the message from modal
    const userMessage = interaction.fields.getTextInputValue('user_message');

    // Write response with message - this BLOCKS the action and sends message to Claude
    const response = {
      decision: 'reject',
      message: userMessage,
      timestamp: new Date().toISOString(),
      user: interaction.user.tag,
    };

    writeFileSync(
      join(RESPONSES_DIR, `${requestId}.json`),
      JSON.stringify(response, null, 2)
    );

    // Update original message
    await pending.message.edit({
      embeds: [
        EmbedBuilder.from(pending.message.embeds[0])
          .setColor(0x5865F2)
          .addFields({ name: '💬 Reply', value: userMessage.slice(0, 1024) })
          .setFooter({ text: `💬 Replied by ${interaction.user.tag}` })
      ],
      components: []
    });

    await interaction.reply({ content: `💬 Message sent to Claude`, flags: 64 });

    // Cleanup
    try { unlinkSync(pending.filePath); } catch {}
    pendingRequests.delete(requestId);

    console.log(`[${new Date().toISOString()}] Reply: ${requestId} by ${interaction.user.tag}: "${userMessage.slice(0, 50)}..."`);
    return;
  }

  // Handle Button clicks
  if (!interaction.isButton()) return;

  const [action, ...idParts] = interaction.customId.split('_');
  const requestId = idParts.join('_');

  const pending = pendingRequests.get(requestId);
  if (!pending) {
    await interaction.reply({ content: 'Request expired or already handled.', flags: 64 });
    return;
  }

  // Handle Reply button - show modal
  if (action === 'reply') {
    const modal = new ModalBuilder()
      .setCustomId(`modal_${requestId}`)
      .setTitle('Reply to Claude');

    const messageInput = new TextInputBuilder()
      .setCustomId('user_message')
      .setLabel('Your message/instruction for Claude')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g., "Use a different approach..." or "Add error handling first"')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);
    return;
  }

  // Clear timeout for other actions
  clearTimeout(pending.timeoutId);

  // Write response
  const response = {
    decision: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'approve_always',
    timestamp: new Date().toISOString(),
    user: interaction.user.tag,
  };

  writeFileSync(
    join(RESPONSES_DIR, `${requestId}.json`),
    JSON.stringify(response, null, 2)
  );

  // Update message
  const statusEmoji = action === 'reject' ? '❌' : '✅';
  const statusText = action === 'reject' ? 'Rejected' : action === 'approve_always' ? 'Always Allowed' : 'Approved';

  await pending.message.edit({
    embeds: [
      EmbedBuilder.from(pending.message.embeds[0])
        .setColor(action === 'reject' ? 0xff0000 : 0x00ff00)
        .setFooter({ text: `${statusEmoji} ${statusText} by ${interaction.user.tag}` })
    ],
    components: []
  });

  await interaction.reply({ content: `${statusEmoji} ${statusText}`, flags: 64 });

  // Cleanup request file
  try {
    unlinkSync(pending.filePath);
  } catch {}

  pendingRequests.delete(requestId);

  console.log(`[${new Date().toISOString()}] ${statusText}: ${requestId} by ${interaction.user.tag}`);
}

/**
 * Handle timeout
 */
async function handleTimeout(requestId, message) {
  const pending = pendingRequests.get(requestId);
  if (!pending) return;

  // Write timeout response (default action)
  const response = {
    decision: config.defaultAction || 'approve',
    timestamp: new Date().toISOString(),
    user: 'timeout',
  };

  writeFileSync(
    join(RESPONSES_DIR, `${requestId}.json`),
    JSON.stringify(response, null, 2)
  );

  // Update message
  await message.edit({
    embeds: [
      EmbedBuilder.from(message.embeds[0])
        .setColor(0xffaa00)
        .setFooter({ text: `⏱️ Timeout - Auto ${config.defaultAction || 'approved'}` })
    ],
    components: []
  });

  // Cleanup
  try {
    unlinkSync(pending.filePath);
  } catch {}

  pendingRequests.delete(requestId);

  console.log(`[${new Date().toISOString()}] Timeout: ${requestId}`);
}

// Event handlers
client.once('ready', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  Claude Code Discord Bot                               ║
║  ──────────────────────────────────────────────────── ║
║  Bot:     ${client.user.tag.padEnd(42)}║
║  Channel: ${config.channelId.padEnd(42)}║
║  Timeout: ${(config.timeoutSeconds + 's').padEnd(42)}║
║  Default: ${(config.defaultAction || 'approve').padEnd(42)}║
╚════════════════════════════════════════════════════════╝
`);

  // Start watching for new requests
  const watcher = chokidar.watch(join(REQUESTS_DIR, '*.json'), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  watcher.on('add', processRequest);

  console.log(`Watching for requests in: ${REQUESTS_DIR}\n`);
});

client.on('interactionCreate', handleInteraction);

client.on('error', (err) => {
  console.error('Discord client error:', err);
});

// Start bot
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable not set!');
  console.error('Usage: DISCORD_BOT_TOKEN=your_token npm start');
  process.exit(1);
}

client.login(token);
