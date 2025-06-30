/* eslint-disable @typescript-eslint/no-var-requires */
import mongoose from 'mongoose';

import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../../services/chat.service';
import { Chat, CreateChatPayload } from '../../types/chat';
import { Message } from '../../types/message';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('Chat service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  const mockChatPayload: CreateChatPayload = {
    participants: ['testUser'],
    messages: [
      {
        msg: 'Hello!',
        msgFrom: 'testUser',
        msgDateTime: '2025-01-01T00:00:00Z',
      },
    ],
  };

  // ----------------------------------------------------------------------------
  // 1. saveChat
  // ----------------------------------------------------------------------------
  describe('saveChat', () => {
    // TODO: Task 3 - Write tests for the saveChat function


    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      // 2) Mock message creation
      mockingoose(MessageModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      // 3) Mock chat creation
      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['testUser'],
          messages: [new mongoose.Types.ObjectId()],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      // 4) Call the service
      const result = await saveChat(mockChatPayload);

      // 5) Verify no error
      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.participants[0]?.toString()).toEqual(expect.any(String));
      expect(result.messages[0]?.toString()).toEqual(expect.any(String));
    });

    it('should successfully save a chat with multiple messages', async () => {
      const multiMessagePayload: CreateChatPayload = {
        participants: ['user1', 'user2'],
        messages: [
          {
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: '2025-01-01T00:00:00Z',
          },
          {
            msg: 'Hi there!',
            msgFrom: 'user2',
            msgDateTime: '2025-01-01T00:01:00Z',
          },
        ],
      };

      mockingoose(MessageModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          msg: 'Hello!',
          msgFrom: 'user1',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      const result = await saveChat(multiMessagePayload);

      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
    });



    it('should handle empty messages array', async () => {
      const emptyMessagesPayload: CreateChatPayload = {
        participants: ['testUser'],
        messages: [],
      };

      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['testUser'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      const result = await saveChat(emptyMessagesPayload);

      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result.messages).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. createMessage
  // ----------------------------------------------------------------------------
  describe('createMessage', () => {
    // TODO: Task 3 - Write tests for the createMessage function
    const mockMessage: Message = {
      msg: 'Hey!',
      msgFrom: 'userX',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      // Mock the user existence check
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'userX' },
        'findOne',
      );

      // Mock the created message
      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(mockMessage);

      expect(result).toMatchObject({
        msg: 'Hey!',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      });
    });



    it('should handle message with empty content', async () => {
      const emptyMessage: Message = {
        msg: '',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      };

      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...emptyMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(emptyMessage);

      if ('error' in result) {
        throw new Error(`Expected a Message, got error: ${result.error}`);
      }

      expect(result.msg).toBe('');
    });

    it('should automatically set type to direct', async () => {
      const messageWithoutType = {
        msg: 'Test message',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      } as Message;

      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...messageWithoutType,
        type: 'direct',
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(messageWithoutType);

      if ('error' in result) {
        throw new Error(`Expected a Message, got error: ${result.error}`);
      }

      expect(result.type).toBe('direct');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. addMessageToChat
  // ----------------------------------------------------------------------------
  describe('addMessageToChat', () => {
    // TODO: Task 3 - Write tests for the addMessageToChat function
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      // Mock findByIdAndUpdate
      mockingoose(ChatModel).toReturn(mockUpdatedChat, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return error when chat is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Chat not found');
    });

    it('should return error when database operation fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to add message to chat');
    });

    it('should handle invalid chat ID format', async () => {
      const invalidChatId = 'invalid-id';
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(new Error('Cast error'), 'findOneAndUpdate');

      const result = await addMessageToChat(invalidChatId, messageId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to add message to chat');
    });
  });

  // ----------------------------------------------------------------------------
  // 4. getChat
  // ----------------------------------------------------------------------------
  describe('getChat', () => {
    it('should retrieve a chat by ID with populated messages', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'testUser',
            msgDateTime: new Date(),
            type: 'direct',
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'testUser',
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOne');

      const result = await getChat(chatId);

      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result._id).toEqual(mockChat._id);
      expect(result.participants).toEqual(mockChat.participants);
    });

    it('should return error when chat is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(null, 'findOne');

      const result = await getChat(chatId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Chat not found');
    });

    it('should return error when database operation fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(new Error('Database error'), 'findOne');

      const result = await getChat(chatId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to retrieve chat');
    });

    it('should handle invalid chat ID format', async () => {
      const invalidChatId = 'invalid-id';

      mockingoose(ChatModel).toReturn(new Error('Cast error'), 'findOne');

      const result = await getChat(invalidChatId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to retrieve chat');
    });
  });

  // ----------------------------------------------------------------------------
  // 5. addParticipantToChat
  // ----------------------------------------------------------------------------
  describe('addParticipantToChat', () => {
    // TODO: Task 3 - Write tests for the addParticipantToChat function
    it('should add a participant if user exists', async () => {
      // Mock user
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(mockChat._id!.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return error when chat is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = 'newUser';

      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addParticipantToChat(chatId, userId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Chat not found');
    });

    it('should return error when database operation fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = 'newUser';

      mockingoose(ChatModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await addParticipantToChat(chatId, userId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to add participant');
    });

    it('should handle adding duplicate participant (using $addToSet)', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = 'existingUser';

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['existingUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(chatId, userId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.participants).toHaveLength(1);
      expect(result.participants).toContain('existingUser');
    });

    it('should handle invalid chat ID format', async () => {
      const invalidChatId = 'invalid-id';
      const userId = 'newUser';

      mockingoose(ChatModel).toReturn(new Error('Cast error'), 'findOneAndUpdate');

      const result = await addParticipantToChat(invalidChatId, userId);

      if (!('error' in result)) {
        throw new Error('Expected an error, got a Chat');
      }

      expect(result.error).toBe('Failed to add participant');
    });
  });

  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0]], 'find');

      const result = await getChatsByParticipants(['user1', 'user2']);
      expect(result).toHaveLength(1);
      expect(result[0].participants).toEqual(['user1', 'user2']);
    });

    it('should retrieve chats by participants where the provided list is a subset', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user2', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0], mockChats[1]], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(2);
      expect(result[0].participants).toContain('user1');
      expect(result[1].participants).toContain('user1');
    });

    it('should return an empty array if no chats are found', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return null if chats query returns null', async () => {
      mockingoose(ChatModel).toReturn(null, 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toBeNull();
    });

    it('should return an empty array if a database error occurs', async () => {
      mockingoose(ChatModel).toReturn(new Error('database error'), 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should handle empty participants array', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants([]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple participants query', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn(mockChats, 'find');

      const result = await getChatsByParticipants(['user1', 'user2', 'user3']);
      expect(result).toHaveLength(1);
      expect(result[0].participants).toContain('user1');
      expect(result[0].participants).toContain('user2');
      expect(result[0].participants).toContain('user3');
    });
  });
});