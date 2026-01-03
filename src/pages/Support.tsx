import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_SUPPORT = 'https://functions.poehali.dev/a6c5b7a0-809f-4c1e-8745-26b11f71e3de';

type Ticket = {
  id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: number;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
};

type SupportProps = {
  userId: number;
  onBack: () => void;
};

export default function Support({ userId, onBack }: SupportProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'chat'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket && view === 'chat') {
      loadMessages(selectedTicket.id);
      const interval = setInterval(() => loadMessages(selectedTicket.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket, view]);

  const loadTickets = async () => {
    try {
      const response = await fetch(`${API_SUPPORT}?action=tickets&user_id=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setTickets(data);
      }
    } catch (error) {
      console.error('Failed to load tickets', error);
    }
  };

  const loadMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`${API_SUPPORT}?action=messages&ticket_id=${ticketId}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !firstMessage.trim()) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_SUPPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_ticket',
          user_id: userId,
          subject,
          message: firstMessage,
        }),
      });

      if (response.ok) {
        toast({ title: 'Обращение создано!' });
        setSubject('');
        setFirstMessage('');
        setView('list');
        loadTickets();
      }
    } catch (error) {
      toast({ title: 'Ошибка создания', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicket) return;

    try {
      const response = await fetch(API_SUPPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          ticket_id: selectedTicket.id,
          sender_id: userId,
          message: messageText,
          is_admin_reply: false,
        }),
      });

      if (response.ok) {
        setMessageText('');
        loadMessages(selectedTicket.id);
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ru', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (view === 'create') {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setView('list')}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <h1 className="text-lg font-semibold">Новое обращение</h1>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-medium mb-2 block">Тема обращения</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Кратко опишите проблему"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Сообщение</label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Подробно опишите вашу проблему..."
              rows={10}
            />
          </div>

          <Button onClick={handleCreateTicket} className="w-full">
            Отправить обращение
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'chat' && selectedTicket) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 p-4 border-b bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setView('list');
              setSelectedTicket(null);
            }}
          >
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold truncate">{selectedTicket.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {selectedTicket.status === 'open' ? 'Открыто' : 'Закрыто'}
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.is_admin_reply
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {msg.is_admin_reply && (
                    <p className="text-xs font-semibold mb-1">Поддержка</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {selectedTicket.status === 'open' && (
          <div className="border-t p-4 bg-card">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Введите сообщение..."
              />
              <Button onClick={handleSendMessage} size="icon">
                <Icon name="Send" size={20} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeft" size={24} />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Поддержка</h1>
        <Button variant="default" size="icon" onClick={() => setView('create')}>
          <Icon name="Plus" size={24} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Icon name="MessageSquare" size={64} className="text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Нет обращений</h2>
            <p className="text-muted-foreground mb-6">
              Создайте обращение, если у вас есть вопросы
            </p>
            <Button onClick={() => setView('create')}>
              <Icon name="Plus" size={20} className="mr-2" />
              Создать обращение
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setView('chat');
                }}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{ticket.subject}</CardTitle>
                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                      {ticket.status === 'open' ? 'Открыто' : 'Закрыто'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(ticket.created_at)}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
