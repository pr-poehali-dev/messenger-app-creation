import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type Chat = {
  id: string;
  name: string;
  username: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  online: boolean;
  type: 'chat' | 'channel';
};

type Message = {
  id: string;
  text: string;
  time: string;
  sent: boolean;
  status: 'sent' | 'delivered' | 'read';
};

const Index = () => {
  const [view, setView] = useState<'auth' | 'chats' | 'chat' | 'profile'>('auth');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'chat' | 'channel'>('chat');

  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Анна Петрова',
      username: '@anna_petrova',
      lastMessage: 'Привет! Как дела?',
      time: '14:35',
      unread: 2,
      avatar: '',
      online: true,
      type: 'chat',
    },
    {
      id: '2',
      name: 'Рабочая группа',
      username: '@work_group',
      lastMessage: 'Встреча в 15:00',
      time: '13:20',
      unread: 0,
      avatar: '',
      online: false,
      type: 'chat',
    },
    {
      id: '3',
      name: 'Новости IT',
      username: '@it_news',
      lastMessage: 'Новый релиз React 19',
      time: 'вчера',
      unread: 5,
      avatar: '',
      online: false,
      type: 'channel',
    },
  ]);

  const [messages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Как дела?',
      time: '14:30',
      sent: false,
      status: 'read',
    },
    {
      id: '2',
      text: 'Отлично! А у тебя?',
      time: '14:32',
      sent: true,
      status: 'read',
    },
    {
      id: '3',
      text: 'Всё хорошо, работаю над проектом',
      time: '14:35',
      sent: false,
      status: 'read',
    },
  ]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessageText('');
    }
  };

  const handleLogin = () => {
    setView('chats');
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                placeholder="+7 (___) ___-__-__"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input id="username" placeholder="@username" className="mt-1" />
            </div>
            <Button onClick={handleLogin} className="w-full" size="lg">
              Продолжить
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
                onClick={() => setCreateChatOpen(true)}
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
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback className="bg-primary text-white">
                        {chat.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{chat.name}</span>
                        {chat.type === 'channel' && (
                          <Icon name="Volume2" size={14} className="text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <Badge className="rounded-full min-w-[20px] h-5 flex items-center justify-center">
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <AvatarImage src={selectedChat.avatar} />
                <AvatarFallback className="bg-primary text-white">
                  {selectedChat.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{selectedChat.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.online ? 'в сети' : 'был(а) недавно'}
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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.sent
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-white rounded-bl-sm'
                    }`}
                  >
                    <p>{message.text}</p>
                    <div
                      className={`flex items-center gap-1 justify-end mt-1 text-xs ${
                        message.sent ? 'text-white/70' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{message.time}</span>
                      {message.sent && (
                        <Icon
                          name={message.status === 'read' ? 'CheckCheck' : 'Check'}
                          size={14}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
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

      {view === 'profile' && (
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
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-white text-4xl">
                    И
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">Иван Иванов</h3>
                  <p className="text-muted-foreground">@ivan_ivanov</p>
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
                      <p className="text-sm text-muted-foreground">+7 999 123 45 67</p>
                    </div>
                  </button>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="AtSign" size={20} className="text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Имя пользователя</p>
                      <p className="text-sm text-muted-foreground">@ivan_ivanov</p>
                    </div>
                  </button>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Info" size={20} className="text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">О себе</p>
                      <p className="text-sm text-muted-foreground">Разработчик</p>
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
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors">
                    <Icon name="Database" size={20} className="text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">Данные и хранилище</span>
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      <Dialog open={createChatOpen} onOpenChange={setCreateChatOpen}>
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
            <div>
              <Label>Название</Label>
              <Input placeholder="Введите название" className="mt-1" />
            </div>
            <div>
              <Label>Описание</Label>
              <Input placeholder="Описание (необязательно)" className="mt-1" />
            </div>
            <Button className="w-full">Создать</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
