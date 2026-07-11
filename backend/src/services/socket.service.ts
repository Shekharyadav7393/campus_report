import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';

interface ActiveUser {
  userId: string;
  name: string;
  role: string;
  campusId: string;
}

export class SocketService {
  private static io: Server | null = null;
  // Track online users mapping connection socket ID to details
  private static onlineUsers = new Map<string, ActiveUser>();

  /**
   * Initialize Socket.io on the HTTP server
   */
  public static init(server: HttpServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Register presence details
      socket.on('register_user', (user: ActiveUser) => {
        this.onlineUsers.set(socket.id, user);
        this.broadcastPresenceCount(user.campusId);
      });

      // Join campus room
      socket.on('join_campus', (campusId: string) => {
        socket.join(`campus_${campusId}`);
        logger.debug(`Socket ${socket.id} joined room campus_${campusId}`);
      });

      // Join ticket room
      socket.on('join_ticket', (ticketId: string) => {
        socket.join(`ticket_${ticketId}`);
        logger.debug(`Socket ${socket.id} joined room ticket_${ticketId}`);
      });

      // Leave ticket room
      socket.on('leave_ticket', (ticketId: string) => {
        socket.leave(`ticket_${ticketId}`);
        logger.debug(`Socket ${socket.id} left room ticket_${ticketId}`);
      });

      // Broadcast typing indicator to others in ticket room
      socket.on('typing', (data: { ticketId: string; name: string; isTyping: boolean }) => {
        socket.to(`ticket_${data.ticketId}`).emit('typing_status', {
          name: data.name,
          isTyping: data.isTyping,
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        const user = this.onlineUsers.get(socket.id);
        if (user) {
          const campusId = user.campusId;
          this.onlineUsers.delete(socket.id);
          this.broadcastPresenceCount(campusId);
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  /**
   * Broadcast campus online users presence count
   */
  private static broadcastPresenceCount(campusId: string): void {
    if (!this.io) return;

    // Filter online users belonging to this campus
    const count = Array.from(this.onlineUsers.values()).filter(
      (u) => String(u.campusId) === String(campusId)
    ).length;

    this.io.to(`campus_${campusId}`).emit('presence_count', { count });
    logger.debug(`Presence count for campus_${campusId} broadcasted: ${count}`);
  }

  /**
   * Send a real-time event to a specific room
   */
  public static notifyRoom(roomName: string, event: string, payload: any): void {
    if (!this.io) {
      logger.warn('Socket.io server not initialized. Skipping notifyRoom.');
      return;
    }
    this.io.to(roomName).emit(event, payload);
    logger.debug(`Socket emit to ${roomName} - Event: ${event}`);
  }
}
