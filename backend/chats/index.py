import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для работы с чатами: создание, получение списка, поиск пользователей'''
    method = event.get('httpMethod', 'GET')
    path = event.get('queryStringParameters') or {}
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
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
            
            if action == 'create_chat':
                chat_type = data.get('type', 'chat')
                name = data.get('name', '').strip()
                description = data.get('description', '').strip()
                created_by = data.get('created_by')
                member_ids = data.get('member_ids', [])
                
                if not created_by:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'created_by is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO chats (type, name, description, created_by) VALUES (%s, %s, %s, %s) RETURNING id",
                    (chat_type, name, description, created_by)
                )
                chat_id = cur.fetchone()['id']
                
                cur.execute(
                    "INSERT INTO chat_members (chat_id, user_id, role) VALUES (%s, %s, %s)",
                    (chat_id, created_by, 'owner')
                )
                
                for member_id in member_ids:
                    if member_id != created_by:
                        cur.execute(
                            "INSERT INTO chat_members (chat_id, user_id, role) VALUES (%s, %s, %s)",
                            (chat_id, member_id, 'member')
                        )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'search_users':
                query = data.get('query', '').strip().lower()
                
                if not query:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'query is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "SELECT id, username, display_name, avatar_url FROM users WHERE LOWER(username) LIKE %s OR LOWER(display_name) LIKE %s LIMIT 20",
                    (f'%{query}%', f'%{query}%')
                )
                users = cur.fetchall()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(u) for u in users]),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            user_id = path.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id is required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT 
                    c.id,
                    c.type,
                    c.name,
                    c.avatar_url,
                    (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND NOT (%s = ANY(m.read_by))) as unread_count,
                    (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url))
                     FROM chat_members cm 
                     JOIN users u ON u.id = cm.user_id 
                     WHERE cm.chat_id = c.id AND cm.user_id != %s) as members
                FROM chats c
                JOIN chat_members cm ON cm.chat_id = c.id
                WHERE cm.user_id = %s
                ORDER BY last_message_time DESC NULLS LAST
            """, (user_id, user_id, user_id))
            
            chats = cur.fetchall()
            conn.close()
            
            result = []
            for chat in chats:
                chat_dict = dict(chat)
                if chat_dict['members']:
                    chat_dict['members'] = chat_dict['members']
                else:
                    chat_dict['members'] = []
                result.append(chat_dict)
            
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
