import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const API_ADMIN = 'https://functions.poehali.dev/afa0b253-f082-4403-9685-5941d5cc7bf7';
const API_SUPPORT = 'https://functions.poehali.dev/a6c5b7a0-809f-4c1e-8745-26b11f71e3de';

type User = {
  id: number;
  username: string;
  display_name: string;
  phone: string;
  is_blocked: boolean;
  blocked_reason?: string;
  created_at: string;
};

type IPBlock = {
  id: number;
  ip_address: string;
  reason?: string;
  blocked_at: string;
  blocked_by_username: string;
};

type SupportTicket = {
  id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  username: string;
  display_name: string;
};

type SupportMessage = {
  id: number;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  username: string;
  display_name: string;
};

type AdminProps = {
  adminId: number;
  onBack: () => void;
};

export default function Admin({ adminId, onBack }: AdminProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [ipBlocks, setIPBlocks] = useState<IPBlock[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');

  const [blockUserDialog, setBlockUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const [blockIPDialog, setBlockIPDialog] = useState(false);
  const [ipAddress, setIPAddress] = useState('');
  const [ipBlockReason, setIPBlockReason] = useState('');

  useEffect(() => {
    loadUsers();
    loadIPBlocks();
    loadSupportTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketMessages(selectedTicket.id);
      const interval = setInterval(() => loadTicketMessages(selectedTicket.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_ADMIN}?action=users`, {
        headers: { 'X-Admin-Id': adminId.toString() },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users', error);
    }
  };

  const loadIPBlocks = async () => {
    try {
      const response = await fetch(`${API_ADMIN}?action=ip_blocks`, {
        headers: { 'X-Admin-Id': adminId.toString() },
      });
      const data = await response.json();
      if (response.ok) {
        setIPBlocks(data);
      }
    } catch (error) {
      console.error('Failed to load IP blocks', error);
    }
  };

  const loadSupportTickets = async () => {
    try {
      const response = await fetch(`${API_SUPPORT}?action=tickets&status=open`);
      const data = await response.json();
      if (response.ok) {
        setSupportTickets(data);
      }
    } catch (error) {
      console.error('Failed to load support tickets', error);
    }
  };

  const loadTicketMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`${API_SUPPORT}?action=messages&ticket_id=${ticketId}`);
      const data = await response.json();
      if (response.ok) {
        setTicketMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(API_ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': adminId.toString(),
        },
        body: JSON.stringify({
          action: 'block_user',
          user_id: selectedUser.id,
          reason: blockReason,
        }),
      });

      if (response.ok) {
        toast({ title: 'Пользователь заблокирован' });
        setBlockUserDialog(false);
        setBlockReason('');
        loadUsers();
      }
    } catch (error) {
      toast({ title: 'Ошибка блокировки', variant: 'destructive' });
    }
  };

  const handleUnblockUser = async (userId: number) => {
    try {
      const response = await fetch(API_ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': adminId.toString(),
        },
        body: JSON.stringify({
          action: 'unblock_user',
          user_id: userId,
        }),
      });

      if (response.ok) {
        toast({ title: 'Пользователь разблокирован' });
        loadUsers();
      }
    } catch (error) {
      toast({ title: 'Ошибка разблокировки', variant: 'destructive' });
    }
  };

  const handleBlockIP = async () => {
    if (!ipAddress.trim()) {
      toast({ title: 'Введите IP адрес', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': adminId.toString(),
        },
        body: JSON.stringify({
          action: 'block_ip',
          ip_address: ipAddress,
          reason: ipBlockReason,
        }),
      });

      if (response.ok) {
        toast({ title: 'IP адрес заблокирован' });
        setBlockIPDialog(false);
        setIPAddress('');
        setIPBlockReason('');
        loadIPBlocks();
      }
    } catch (error) {
      toast({ title: 'Ошибка блокировки', variant: 'destructive' });
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      const response = await fetch(API_ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': adminId.toString(),
        },
        body: JSON.stringify({
          action: 'unblock_ip',
          ip_address: ip,
        }),
      });

      if (response.ok) {
        toast({ title: 'IP адрес разблокирован' });
        loadIPBlocks();
      }
    } catch (error) {
      toast({ title: 'Ошибка разблокировки', variant: 'destructive' });
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const response = await fetch(API_SUPPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          ticket_id: selectedTicket.id,
          sender_id: adminId,
          message: replyText,
          is_admin_reply: true,
        }),
      });

      if (response.ok) {
        setReplyText('');
        loadTicketMessages(selectedTicket.id);
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(API_SUPPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_ticket',
          ticket_id: selectedTicket.id,
        }),
      });

      if (response.ok) {
        toast({ title: 'Обращение закрыто' });
        setSelectedTicket(null);
        loadSupportTickets();
      }
    } catch (error) {
      toast({ title: 'Ошибка закрытия', variant: 'destructive' });
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

  if (selectedTicket) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{selectedTicket.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {selectedTicket.display_name} (@{selectedTicket.username})
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleCloseTicket}>
            Закрыть
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {ticketMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.is_admin_reply
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {!msg.is_admin_reply && (
                    <p className="text-xs font-semibold mb-1">{msg.display_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4 bg-card">
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Ответ пользователю..."
              rows={3}
            />
            <Button onClick={handleSendReply} size="icon" className="self-end">
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeft" size={24} />
        </Button>
        <h1 className="text-lg font-semibold">Админ-панель</h1>
      </div>

      <Tabs defaultValue="support" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="support" className="flex-1">
            Поддержка
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1">
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="ip" className="flex-1">
            IP блокировки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support" className="flex-1 overflow-hidden mt-0">
          <div className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {supportTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Icon name="CheckCircle" size={64} className="text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Нет открытых обращений</h2>
                  <p className="text-muted-foreground">Все обращения обработаны</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{ticket.subject}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ticket.display_name} (@{ticket.username})
                            </p>
                          </div>
                          <Badge variant="default">Открыто</Badge>
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
        </TabsContent>

        <TabsContent value="users" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">
                          {user.display_name}
                          {user.is_blocked && (
                            <Badge variant="destructive" className="ml-2">
                              Заблокирован
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          @{user.username} • {user.phone}
                        </p>
                        {user.blocked_reason && (
                          <p className="text-xs text-destructive mt-1">{user.blocked_reason}</p>
                        )}
                      </div>
                      {user.is_blocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                        >
                          Разблокировать
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setBlockUserDialog(true);
                          }}
                        >
                          Заблокировать
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ip" className="flex-1 overflow-hidden mt-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <Button onClick={() => setBlockIPDialog(true)} className="w-full">
                <Icon name="Ban" size={20} className="mr-2" />
                Заблокировать IP
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {ipBlocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Icon name="Shield" size={64} className="text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Нет заблокированных IP</h2>
                </div>
              ) : (
                <div className="space-y-3">
                  {ipBlocks.map((block) => (
                    <Card key={block.id}>
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-mono">
                              {block.ip_address}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              Заблокировал: {block.blocked_by_username}
                            </p>
                            {block.reason && (
                              <p className="text-xs text-muted-foreground mt-1">{block.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(block.blocked_at)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockIP(block.ip_address)}
                          >
                            Разблокировать
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={blockUserDialog} onOpenChange={setBlockUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Пользователь</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUser?.display_name} (@{selectedUser?.username})
              </p>
            </div>
            <div>
              <Label>Причина блокировки</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockUserDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockIPDialog} onOpenChange={setBlockIPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать IP адрес</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>IP адрес</Label>
              <Input
                value={ipAddress}
                onChange={(e) => setIPAddress(e.target.value)}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <Label>Причина блокировки</Label>
              <Textarea
                value={ipBlockReason}
                onChange={(e) => setIPBlockReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockIPDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleBlockIP}>
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
