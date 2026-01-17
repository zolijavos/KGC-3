import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { startConversationSchema, type StartConversationDto } from './dto/start-conversation.dto';
import { sendMessageSchema, type SendMessageDto } from './dto/send-message.dto';
import type { MessageListOptions, StartConversationInput } from './interfaces/chat.interface';

/**
 * Decorator to get current user ID from authenticated request
 * Extracts userId from JWT token attached to request by JwtAuthGuard
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: { userId?: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new Error('User ID not found in request - ensure JwtAuthGuard is applied');
    }
    return userId;
  },
);

/**
 * JWT Auth Guard placeholder - should import from @kgc/auth
 * TODO: Replace with actual JwtAuthGuard import when auth module is available
 */
const JwtAuthGuard = class JwtAuthGuardPlaceholder {};

/**
 * Chat REST API Controller
 *
 * Provides HTTP endpoints for:
 * - Conversation management
 * - Message history
 * - Unread counts
 *
 * All endpoints require JWT authentication.
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get all conversations for current user
   */
  @Get('conversations')
  async getConversations(@CurrentUserId() userId: string) {
    return this.chatService.getConversations(userId);
  }

  /**
   * Get a specific conversation
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') conversationId: string,
    @CurrentUserId() userId: string
  ) {
    return this.chatService.getConversation(userId, conversationId);
  }

  /**
   * Start a new conversation
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async startConversation(
    @CurrentUserId() userId: string,
    @Body() body: StartConversationDto
  ) {
    const validated = startConversationSchema.parse(body);
    const input: StartConversationInput = {
      participantIds: validated.participantIds,
    };
    if (validated.initialMessage !== undefined) {
      input.initialMessage = validated.initialMessage;
    }
    return this.chatService.startConversation(userId, input);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUserId() userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('after') after?: string
  ) {
    const options: MessageListOptions = {
      conversationId,
    };
    if (limit !== undefined) {
      options.limit = parseInt(limit, 10);
    }
    if (before !== undefined) {
      options.before = new Date(before);
    }
    if (after !== undefined) {
      options.after = new Date(after);
    }

    return this.chatService.getMessages(userId, options);
  }

  /**
   * Send a message (REST fallback, prefer WebSocket)
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUserId() userId: string,
    @Body() body: SendMessageDto
  ) {
    const validated = sendMessageSchema.parse(body);
    return this.chatService.sendMessage(userId, validated);
  }

  /**
   * Mark conversation as read
   */
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUserId() userId: string
  ) {
    await this.chatService.markAsRead(userId, conversationId);
  }

  /**
   * Get unread counts for all conversations
   */
  @Get('unread')
  async getUnreadCounts(@CurrentUserId() userId: string) {
    return this.chatService.getUnreadCounts(userId);
  }
}
