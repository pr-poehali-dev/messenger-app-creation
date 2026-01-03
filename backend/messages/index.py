import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для отправки и получения сообщений в реальном времени'''
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
            chat_id = data.get('chat_id')
            sender_id = data.get('sender_id')
            text = data.get('text', '').strip()
            
            if not chat_id or not sender_id or not text:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id, sender_id and text are required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "INSERT INTO messages (chat_id, sender_id, text, read_by) VALUES (%s, %s, %s, ARRAY[%s]) RETURNING id, created_at",
                (chat_id, sender_id, text, sender_id)
            )
            result = cur.fetchone()
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
        
        elif method == 'GET':
            chat_id = path.get('chat_id')
            user_id = path.get('user_id')
            limit = int(path.get('limit', 100))
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id is required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT 
                    m.id,
                    m.text,
                    m.sender_id,
                    m.created_at,
                    m.read_by,
                    u.username,
                    u.display_name,
                    u.avatar_url
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE m.chat_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s
            """, (chat_id, limit))
            
            messages = cur.fetchall()
            
            if user_id:
                cur.execute(
                    "UPDATE messages SET read_by = array_append(read_by, %s) WHERE chat_id = %s AND NOT (%s = ANY(read_by))",
                    (user_id, chat_id, user_id)
                )
                conn.commit()
            
            conn.close()
            
            result = []
            for msg in messages:
                msg_dict = dict(msg)
                msg_dict['created_at'] = msg_dict['created_at'].isoformat()
                msg_dict['read_by'] = list(msg_dict['read_by']) if msg_dict['read_by'] else []
                result.append(msg_dict)
            
            result.reverse()
            
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
