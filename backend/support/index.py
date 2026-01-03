import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для чата поддержки: создание тикетов, отправка и получение сообщений'''
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST':
            data = json.loads(event.get('body', '{}'))
            action = data.get('action')
            
            if action == 'create_ticket':
                user_id = data.get('user_id')
                subject = data.get('subject', '').strip()
                message = data.get('message', '').strip()
                
                if not user_id or not subject or not message:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id, subject and message are required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO support_tickets (user_id, subject, status) VALUES (%s, %s, %s) RETURNING id, created_at",
                    (user_id, subject, 'open')
                )
                ticket = cur.fetchone()
                ticket_id = ticket['id']
                
                cur.execute(
                    "INSERT INTO support_messages (ticket_id, sender_id, message, is_admin_reply) VALUES (%s, %s, %s, %s)",
                    (ticket_id, user_id, message, False)
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'ticket_id': ticket_id,
                        'created_at': ticket['created_at'].isoformat()
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_message':
                ticket_id = data.get('ticket_id')
                sender_id = data.get('sender_id')
                message = data.get('message', '').strip()
                is_admin_reply = data.get('is_admin_reply', False)
                
                if not ticket_id or not sender_id or not message:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'ticket_id, sender_id and message are required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO support_messages (ticket_id, sender_id, message, is_admin_reply) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                    (ticket_id, sender_id, message, is_admin_reply)
                )
                result = cur.fetchone()
                
                cur.execute(
                    "UPDATE support_tickets SET updated_at = NOW() WHERE id = %s",
                    (ticket_id,)
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message_id': result['id'],
                        'created_at': result['created_at'].isoformat()
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'close_ticket':
                ticket_id = data.get('ticket_id')
                
                if not ticket_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'ticket_id is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE support_tickets SET status = %s, updated_at = NOW() WHERE id = %s",
                    ('closed', ticket_id)
                )
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            action = query_params.get('action')
            
            if action == 'tickets':
                user_id = query_params.get('user_id')
                status = query_params.get('status')
                
                if user_id:
                    if status:
                        cur.execute("""
                            SELECT id, subject, status, created_at, updated_at
                            FROM support_tickets
                            WHERE user_id = %s AND status = %s
                            ORDER BY updated_at DESC
                        """, (user_id, status))
                    else:
                        cur.execute("""
                            SELECT id, subject, status, created_at, updated_at
                            FROM support_tickets
                            WHERE user_id = %s
                            ORDER BY updated_at DESC
                        """, (user_id,))
                else:
                    if status:
                        cur.execute("""
                            SELECT st.id, st.subject, st.status, st.created_at, st.updated_at, st.user_id,
                                   u.username, u.display_name
                            FROM support_tickets st
                            JOIN users u ON u.id = st.user_id
                            WHERE st.status = %s
                            ORDER BY st.updated_at DESC
                        """, (status,))
                    else:
                        cur.execute("""
                            SELECT st.id, st.subject, st.status, st.created_at, st.updated_at, st.user_id,
                                   u.username, u.display_name
                            FROM support_tickets st
                            JOIN users u ON u.id = st.user_id
                            ORDER BY st.updated_at DESC
                        """)
                
                tickets = cur.fetchall()
                conn.close()
                
                result = []
                for ticket in tickets:
                    ticket_dict = dict(ticket)
                    if ticket_dict.get('created_at'):
                        ticket_dict['created_at'] = ticket_dict['created_at'].isoformat()
                    if ticket_dict.get('updated_at'):
                        ticket_dict['updated_at'] = ticket_dict['updated_at'].isoformat()
                    result.append(ticket_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
            
            elif action == 'messages':
                ticket_id = query_params.get('ticket_id')
                
                if not ticket_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'ticket_id is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    SELECT sm.id, sm.message, sm.is_admin_reply, sm.created_at,
                           u.username, u.display_name, u.avatar_url
                    FROM support_messages sm
                    JOIN users u ON u.id = sm.sender_id
                    WHERE sm.ticket_id = %s
                    ORDER BY sm.created_at ASC
                """, (ticket_id,))
                
                messages = cur.fetchall()
                conn.close()
                
                result = []
                for msg in messages:
                    msg_dict = dict(msg)
                    if msg_dict.get('created_at'):
                        msg_dict['created_at'] = msg_dict['created_at'].isoformat()
                    result.append(msg_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
