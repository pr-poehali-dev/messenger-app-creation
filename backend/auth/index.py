import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для регистрации и авторизации пользователей'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        data = json.loads(event.get('body', '{}'))
        username = data.get('username', '').strip()
        phone = data.get('phone', '').strip()
        display_name = data.get('display_name', '').strip()
        
        if not username or not phone or not display_name:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Username, phone and display_name are required'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute(
            "SELECT id, username, phone, display_name, bio, avatar_url, is_blocked, blocked_reason, is_admin FROM users WHERE username = %s OR phone = %s",
            (username, phone)
        )
        user = cur.fetchone()
        
        if user and user['is_blocked']:
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Account blocked', 'reason': user['blocked_reason']}),
                'isBase64Encoded': False
            }
        
        if user:
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user_id': user['id'],
                    'username': user['username'],
                    'phone': user['phone'],
                    'display_name': user['display_name'],
                    'bio': user['bio'],
                    'avatar_url': user['avatar_url'],
                    'is_admin': user['is_admin']
                }),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "INSERT INTO users (username, phone, display_name) VALUES (%s, %s, %s) RETURNING id, username, phone, display_name, bio, avatar_url",
            (username, phone, display_name)
        )
        new_user = cur.fetchone()
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'user_id': new_user['id'],
                'username': new_user['username'],
                'phone': new_user['phone'],
                'display_name': new_user['display_name'],
                'bio': new_user['bio'],
                'avatar_url': new_user['avatar_url']
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }