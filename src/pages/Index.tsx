import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Support from './Support';
import Admin from './Admin';

const API_AUTH = 'https://functions.poehali.dev/89a15834-000e-41da-b452-52d4c63f4881';
const API_CHATS = 'https://functions.poehali.dev/0cd1a33e-c216-4261-a7f1-b604a0b890be';
const API_MESSAGES = 'https://functions.poehali.dev/3ff7214a-87d1-435c-83af-06469b856616';

type User = {
  user_id: number;
  username: string;
  phone: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  is_admin?: boolean;
};

type Chat = {
  id: number;
  type: 'chat' | 'channel';
  name: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  members?: User[];
};

type Message = {
  id: number;
  text: string;
  sender_id: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  read_by: number[];
};

const Index = () => {
  const { toast } = useToast();
  const [view, setView] = useState<'auth' | 'chats' | 'chat' | 'profile' | 'support' | 'admin'>('auth');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [searchUsersOpen, setSearchUsersOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'chat' | 'channel'>('chat');
  const [newChatName, setNewChatName] = useState('');
  const [newChatDesc, setNewChatDesc] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setView('chats');
      loadChats(user.user_id);
    }
  }, []);

  useEffect(() => {
    if (selectedChat && currentUser) {
      loadMessages(selectedChat.id);
      const interval = setInterval(() => loadMessages(selectedChat.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat, currentUser]);

  const handleLogin = async () => {
    if (!phone || !username || !displayName) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, username, display_name: displayName }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const userData = { ...data, is_admin: data.is_admin || false };
        setCurrentUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setView('chats');
        loadChats(userData.user_id);
        toast({ title: 'Вход выполнен!' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка подключения', variant: 'destructive' });
    }
    setLoading(false);
  };

  const loadChats = async (userId: number) => {
    try {
      const response = await fetch(`${API_CHATS}?user_id=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to load chats', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_MESSAGES}?chat_id=${chatId}&user_id=${currentUser.user_id}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser) return;

    try {
      const response = await fetch(API_MESSAGES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          sender_id: currentUser.user_id,
          text: messageText,
        }),
      });

      if (response.ok) {
        setMessageText('');
        loadMessages(selectedChat.id);
        loadChats(currentUser.user_id);
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const searchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    
    try {
      const response = await fetch(API_CHATS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_users', query: userSearchQuery }),
      });

      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      }
    } catch (error) {
      toast({ title: 'Ошибка поиска', variant: 'destructive' });
    }
  };

  const handleCreateChat = async () => {
    if (!currentUser) return;
    
    if (newChatType === 'channel' && !newChatName.trim()) {
      toast({ title: 'Введите название канала', variant: 'destructive' });
      return;
    }

    if (newChatType === 'chat' && selectedUsers.length === 0) {
      toast({ title: 'Выберите собеседника', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_CHATS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat',
          type: newChatType,
          name: newChatName || null,
          description: newChatDesc || null,
          created_by: currentUser.user_id,
          member_ids: selectedUsers,
        }),
      });

      if (response.ok) {
        toast({ title: 'Чат создан!' });
        setCreateChatOpen(false);
        setNewChatName('');
        setNewChatDesc('');
        setSelectedUsers([]);
        loadChats(currentUser.user_id);
      }
    } catch (error) {
      toast({ title: 'Ошибка создания', variant: 'destructive' });
    }
  };

  const filteredChats = chats.filter((chat) => {
    const chatName = chat.name || chat.members?.[0]?.display_name || '';
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.members && chat.members.length > 0) {
      return chat.members[0].display_name;
    }
    return 'Чат';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar_url) return chat.avatar_url;
    if (chat.members && chat.members.length > 0) {
      return chat.members[0].avatar_url || '';
    }
    return '';
  };

  const getChatInitial = (chat: Chat) => {
    const name = getChatDisplayName(chat);
    return name[0]?.toUpperCase() || 'C';
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  if (view === 'support') {
    return <Support onBack={() => setView('chats')} />;
  }

  if (view === 'admin') {
    return <Admin onBack={() => setView('chats')} currentUser={currentUser} />;
  }

  if (view === 'auth') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Telegram Mini App</h1>
            <p className="text-gray-500 mt-2">Войдите, чтобы начать общение</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="displayName">Имя для отображения</Label>
              <Input
                id="displayName"
                placeholder="Иван Иванов"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="flex items-center gap-4 p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView('chats')}>
            <Icon name="arrow-left" className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">Профиль</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={currentUser?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {currentUser?.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-bold">{currentUser?.display_name}</h3>
              <p className="text-gray-500">@{currentUser?.username}</p>
              <p className="text-sm text-gray-400 mt-1">{currentUser?.phone}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>О себе</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {currentUser?.bio || 'Информация не указана'}
                </p>
              </div>
              
              <Separator />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  localStorage.removeItem('currentUser');
                  setCurrentUser(null);
                  setView('auth');
                }}
              >
                Выйти
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (view === 'chat' && selectedChat) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView('chats')}>
            <Icon name="arrow-left" className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={getChatAvatar(selectedChat)} />
            <AvatarFallback>{getChatInitial(selectedChat)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{getChatDisplayName(selectedChat)}</h2>
            <p className="text-xs text-gray-500">
              {selectedChat.type === 'channel' ? 'Канал' : 'Личный чат'}
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUser?.user_id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={msg.avatar_url} />
                      <AvatarFallback>{msg.display_name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-xs text-gray-500 mb-1 px-2">{msg.display_name}</span>
                    )}
                    <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-2">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Icon name="send" className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold">Чаты</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView('support')}>
            <Icon name="help-circle" className="w-5 h-5" />
          </Button>
          {currentUser?.is_admin && (
            <Button variant="ghost" size="icon" onClick={() => setView('admin')}>
              <Icon name="shield" className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setView('profile')}>
            <Icon name="user" className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <Icon name="search" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedChat(chat);
                setView('chat');
              }}
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={getChatAvatar(chat)} />
                <AvatarFallback>{getChatInitial(chat)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate">{getChatDisplayName(chat)}</h3>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTime(chat.last_message_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">{chat.last_message || 'Нет сообщений'}</p>
                  {chat.unread_count > 0 && (
                    <Badge className="ml-2 flex-shrink-0">{chat.unread_count}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-white">
        <Button className="w-full" onClick={() => setCreateChatOpen(true)}>
          <Icon name="plus" className="w-5 h-5 mr-2" />
          Новый чат
        </Button>
      </div>

      <Dialog open={createChatOpen} onOpenChange={setCreateChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать чат</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newChatType === 'chat' ? 'default' : 'outline'}
                onClick={() => setNewChatType('chat')}
                className="flex-1"
              >
                Личный чат
              </Button>
              <Button
                variant={newChatType === 'channel' ? 'default' : 'outline'}
                onClick={() => setNewChatType('channel')}
                className="flex-1"
              >
                Канал
              </Button>
            </div>

            {newChatType === 'channel' && (
              <>
                <div>
                  <Label>Название канала</Label>
                  <Input
                    placeholder="Мой канал"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Описание (необязательно)</Label>
                  <Input
                    placeholder="О чем этот канал"
                    value={newChatDesc}
                    onChange={(e) => setNewChatDesc(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Добавить участников</Label>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setSearchUsersOpen(true)}
              >
                <Icon name="user-plus" className="w-4 h-4 mr-2" />
                Поиск пользователей ({selectedUsers.length})
              </Button>
            </div>

            <Button className="w-full" onClick={handleCreateChat}>
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchUsersOpen} onOpenChange={setSearchUsersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поиск пользователей</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Имя или username"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              <Button onClick={searchUsers}>
                <Icon name="search" className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUsers.includes(user.user_id)
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedUsers((prev) =>
                        prev.includes(user.user_id)
                          ? prev.filter((id) => id !== user.user_id)
                          : [...prev, user.user_id]
                      );
                    }}
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
