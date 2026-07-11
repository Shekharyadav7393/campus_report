import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (campusId?: string, ticketId?: string, onEventReceived?: (event: string, data: any) => void) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      // Join campus room if provided
      if (campusId) {
        socket.emit('join_campus', campusId);
      }

      // Join ticket room if provided
      if (ticketId) {
        socket.emit('join_ticket', ticketId);
      }
    });

    // Setup generic event listener if callback provided
    const events = ['new_report', 'report_updated', 'status_updated', 'new_comment', 'new_notice', 'presence_count', 'typing_status'];
    events.forEach((event) => {
      socket.on(event, (data) => {
        if (onEventReceived) {
          onEventReceived(event, data);
        }
      });
    });

    return () => {
      if (ticketId) {
        socket.emit('leave_ticket', ticketId);
      }
      socket.disconnect();
      console.log('Socket disconnected');
    };
  }, [campusId, ticketId]);

  const emit = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { emit, socket: socketRef.current };
};
