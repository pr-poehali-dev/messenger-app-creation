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
  const [view, setView] = useState<'auth' | 'chats' | 'chat' | 'profile'>('auth');
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
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        setView('chats');
        loadChats(data.user_id);
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

  if (view === 'auth') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <Icon name="MessageCircle" size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Мессенджер</h1>
            <p className="text-muted-foreground">Войдите или зарегистрируйтесь</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="username (без @)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="displayName">Ваше имя</Label>
              <Input
                id="displayName"
                placeholder="Иван Иванов"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleLogin} className="w-full" size="lg" disabled={loading}>
              {loading ? 'Загрузка...' : 'Продолжить'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <div className="w-full md:w-96 border-r flex flex-col">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('profile')}
              className="rounded-full"
            >
              <Icon name="Menu" size={24} />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setCreateChatOpen(true);
                  setSearchUsersOpen(true);
                }}
              >
                <Icon name="Plus" size={24} />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Icon
              name="Search"
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button variant="outline" size="sm" className="rounded-full">
              Все
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full">
              Личные
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full">
              Каналы
            </Button>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Нет чатов</p>
              <p className="text-sm mt-2">Нажмите + чтобы создать</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-4 hover:bg-secondary cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-secondary' : ''
                  }`}
                  onClick={() => {
                    setSelectedChat(chat);
                    setView('chat');
                  }}
                >
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={getChatAvatar(chat)} />
                        <AvatarFallback className="bg-primary text-white">
                          {getChatInitial(chat)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {getChatDisplayName(chat)}
                          </span>
                          {chat.type === 'channel' && (
                            <Icon name="Volume2" size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.last_message || 'Нет сообщений'}
                        </p>
                        {chat.unread_count > 0 && (
                          <Badge className="rounded-full min-w-[20px] h-5 flex items-center justify-center">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {view === 'chat' && selectedChat ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setView('chats')}
              >
                <Icon name="ArrowLeft" size={24} />
              </Button>
              <Avatar>
                <AvatarImage src={getChatAvatar(selectedChat)} />
                <AvatarFallback className="bg-primary text-white">
                  {getChatInitial(selectedChat)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{getChatDisplayName(selectedChat)}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.type === 'channel' ? 'Канал' : 'Чат'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Icon name="Phone" size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Icon name="Video" size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Icon name="MoreVertical" size={20} />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 bg-secondary/20">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Напишите первое сообщение
                </div>
              ) : (
                messages.map((message) => {
                  const isSent = message.sender_id === currentUser?.user_id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isSent
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-white rounded-bl-sm'
                        }`}
                      >
                        {!isSent && (
                          <p className="text-xs font-semibold mb-1">{message.display_name}</p>
                        )}
                        <p>{message.text}</p>
                        <div
                          className={`flex items-center gap-1 justify-end mt-1 text-xs ${
                            isSent ? 'text-white/70' : 'text-muted-foreground'
                          }`}
                        >
                          <span>{formatTime(message.created_at)}</span>
                          {isSent && (
                            <Icon
                              name={
                                message.read_by.length > 1 ? 'CheckCheck' : 'Check'
                              }
                              size={14}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Icon name="Smile" size={24} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Icon name="Paperclip" size={24} />
              </Button>
              <Input
                placeholder="Сообщение"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button
                size="icon"
                className="rounded-full shrink-0"
                onClick={handleSendMessage}
              >
                <Icon name="Send" size={20} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-secondary/20">
          <div className="text-center">
            <div className="w-32 h-32 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Icon name="MessageCircle" size={64} className="text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Выберите чат</h2>
            <p className="text-muted-foreground">
              Выберите чат из списка или создайте новый
            </p>
          </div>
        </div>
      )}

      {view === 'profile' && currentUser && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('chats')}>
              <Icon name="ArrowLeft" size={24} />
            </Button>
            <h2 className="text-xl font-semibold">Настройки</h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 py-8">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={currentUser.avatar_url} />
                  <AvatarFallback className="bg-primary text-white text-4xl">
                    {currentUser.display_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{currentUser.display_name}</h3>
                  <p className="text-muted-foreground">@{currentUser.username}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold mb-4">Аккаунт</h4>
                <div className="space-y-1">
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Phone" size={20} className="text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Номер телефона</p>
                      <p className="text-sm text-muted-foreground">{currentUser.phone}</p>
                    </div>
                  </button>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="AtSign" size={20} className="text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Имя пользователя</p>
                      <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
                    </div>
                  </button>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Info" size={20} className="text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">О себе</p>
                      <p className="text-sm text-muted-foreground">{currentUser.bio || 'Не указано'}</p>
                    </div>
                  </button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold mb-4">Настройки</h4>
                <div className="space-y-1">
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Bell" size={20} className="text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">Уведомления</span>
                  </button>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Lock" size={20} className="text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">
                      Конфиденциальность
                    </span>
                  </button>
                  <button
                    className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors"
                    onClick={() => {
                      localStorage.removeItem('currentUser');
                      setCurrentUser(null);
                      setView('auth');
                      toast({ title: 'Вы вышли из аккаунта' });
                    }}
                  >
                    <Icon name="LogOut" size={20} className="text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">Выйти</span>
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      <Dialog open={searchUsersOpen} onOpenChange={setSearchUsersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поиск пользователей</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Введите имя или username"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers}>Найти</Button>
            </div>
            
            <ScrollArea className="h-64">
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Введите запрос для поиска
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-secondary ${
                        selectedUsers.includes(user.user_id) ? 'bg-secondary' : ''
                      }`}
                      onClick={() => {
                        setSelectedUsers((prev) =>
                          prev.includes(user.user_id)
                            ? prev.filter((id) => id !== user.user_id)
                            : [...prev, user.user_id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-primary text-white">
                            {user.display_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedUsers.length > 0 && (
              <Button
                className="w-full"
                onClick={() => {
                  setSearchUsersOpen(false);
                  setCreateChatOpen(true);
                }}
              >
                Продолжить ({selectedUsers.length})
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createChatOpen && !searchUsersOpen} onOpenChange={setCreateChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать {newChatType === 'chat' ? 'чат' : 'канал'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newChatType === 'chat' ? 'default' : 'outline'}
                onClick={() => setNewChatType('chat')}
                className="flex-1"
              >
                Чат
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
                  <Label>Название</Label>
                  <Input
                    placeholder="Введите название"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Input
                    placeholder="Описание (необязательно)"
                    value={newChatDesc}
                    onChange={(e) => setNewChatDesc(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Выбрано участников: {selectedUsers.length}</Label>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setCreateChatOpen(false);
                  setSearchUsersOpen(true);
                }}
              >
                Выбрать участников
              </Button>
            </div>

            <Button className="w-full" onClick={handleCreateChat}>
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
