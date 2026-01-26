/**
 * Online Booking Controller - REST API for Online Booking
 * Epic 26: Online Booking
 *
 * Endpoints:
 * - POST /bookings - Create new booking
 * - POST /bookings/check-availability - Check equipment availability
 * - GET /bookings/time-slots - Get available time slots
 * - GET /bookings/:bookingNumber - Get booking by number
 * - POST /bookings/confirm - Confirm booking
 * - POST /bookings/:id/cancel - Cancel booking
 * - GET /bookings/status/:token - Get booking status by token
 * - POST /bookings/:id/resend-confirmation - Resend confirmation email
 */

import {
  BookingConfirmationService,
  BookingService,
  CancelBookingDto,
  CheckAvailabilityDto,
  ConfirmBookingDto,
  CreateBookingDto,
  GetTimeSlotsDto,
  IAvailabilityCheck,
  IBooking,
  IBookingConfirmation,
  IBookingItem,
  ITimeSlot,
} from '@kgc/online-booking';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('bookings')
@Controller('bookings')
export class OnlineBookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly confirmationService: BookingConfirmationService
  ) {}

  /**
   * Create a new online booking
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new online booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or equipment not available' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ description: 'Booking details' })
  async createBooking(
    @Body() input: CreateBookingDto,
    @Query('tenantId') tenantId: string
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.bookingService.createBooking(input, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (
        message.includes('not available') ||
        message.includes('Validation failed') ||
        message.includes('End date')
      ) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Check equipment availability
   */
  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check equipment availability for dates' })
  @ApiResponse({ status: 200, description: 'Availability check results' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ description: 'Availability check parameters' })
  async checkAvailability(
    @Body() input: CheckAvailabilityDto,
    @Query('tenantId') tenantId: string
  ): Promise<IAvailabilityCheck[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.bookingService.checkAvailability(input, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Get available time slots
   */
  @Get('time-slots')
  @ApiOperation({ summary: 'Get available time slots for a date' })
  @ApiResponse({ status: 200, description: 'Available time slots' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, description: 'Booking type (RENTAL or SERVICE)' })
  async getTimeSlots(
    @Query('tenantId') tenantId: string,
    @Query('date') date: string,
    @Query('type') type?: string
  ): Promise<ITimeSlot[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    if (!date) {
      throw new BadRequestException('date is required');
    }

    const input: GetTimeSlotsDto = {
      date: new Date(date),
      type: (type as 'RENTAL' | 'SERVICE') ?? 'RENTAL',
    };

    try {
      return await this.bookingService.getTimeSlots(input, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Get booking by booking number
   */
  @Get(':bookingNumber')
  @ApiOperation({ summary: 'Get booking by booking number' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiParam({ name: 'bookingNumber', description: 'Booking number (e.g., FOG-2026-00001)' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getBookingByNumber(
    @Param('bookingNumber') bookingNumber: string,
    @Query('tenantId') tenantId: string
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.bookingService.getBookingByNumber(bookingNumber, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }

  /**
   * Confirm booking
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid token, expired, or payment failed' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ description: 'Confirmation details' })
  async confirmBooking(
    @Body() input: ConfirmBookingDto,
    @Query('tenantId') tenantId: string
  ): Promise<IBookingConfirmation> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.confirmationService.confirmBooking(input, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found') || message.includes('Invalid confirmation')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (
        message.includes('expired') ||
        message.includes('cannot be confirmed') ||
        message.includes('Payment failed')
      ) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Cancellation reason' })
  async cancelBooking(
    @Param('id') bookingId: string,
    @Body() input: CancelBookingDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IBooking> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.confirmationService.cancelBooking(bookingId, input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (message.includes('already cancelled') || message.includes('Cannot cancel')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Get booking status by confirmation token
   */
  @Get('status/:token')
  @ApiOperation({ summary: 'Get booking status by confirmation token' })
  @ApiResponse({ status: 200, description: 'Booking status' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiParam({ name: 'token', description: 'Confirmation token' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getBookingStatus(
    @Param('token') token: string,
    @Query('tenantId') tenantId: string
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.confirmationService.getBookingStatus(token, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }

  /**
   * Resend confirmation email
   */
  @Post(':id/resend-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resend booking confirmation email' })
  @ApiResponse({ status: 204, description: 'Confirmation resent' })
  @ApiResponse({ status: 400, description: 'Cannot resend for non-pending booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async resendConfirmation(
    @Param('id') bookingId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      await this.confirmationService.resendConfirmation(bookingId, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (message.includes('Can only resend')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }
}
