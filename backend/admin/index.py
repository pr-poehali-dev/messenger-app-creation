import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для администраторов: управление пользователями, блокировки IP и пользователей'''
    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        admin_id = headers.get('x-admin-id') or headers.get('X-Admin-Id')
        
        if not admin_id:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin authentication required'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (admin_id,))
        admin_check = cur.fetchone()
        
        if not admin_check or not admin_check['is_admin']:
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin privileges required'}),
                'isBase64Encoded': False
            }
        
        if method == 'GET':
            query_params = event.get('queryStringParameters') or {}
            action = query_params.get('action')
            
            if action == 'users':
                cur.execute("""
                    SELECT id, username, display_name, phone, is_blocked, blocked_reason, 
                           created_at, last_active
                    FROM users
                    ORDER BY created_at DESC
                """)
                users = cur.fetchall()
                conn.close()
                
                result = []
                for user in users:
                    user_dict = dict(user)
                    if user_dict.get('created_at'):
                        user_dict['created_at'] = user_dict['created_at'].isoformat()
                    if user_dict.get('last_active'):
                        user_dict['last_active'] = user_dict['last_active'].isoformat()
                    result.append(user_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
            
            elif action == 'ip_blocks':
                cur.execute("""
                    SELECT ib.*, u.username as blocked_by_username
                    FROM ip_blocks ib
                    JOIN users u ON u.id = ib.blocked_by
                    WHERE ib.is_active = true
                    ORDER BY ib.blocked_at DESC
                """)
                blocks = cur.fetchall()
                conn.close()
                
                result = []
                for block in blocks:
                    block_dict = dict(block)
                    if block_dict.get('blocked_at'):
                        block_dict['blocked_at'] = block_dict['blocked_at'].isoformat()
                    result.append(block_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
            
            elif action == 'admin_actions':
                limit = int(query_params.get('limit', 100))
                cur.execute("""
                    SELECT aa.*, u.username as admin_username
                    FROM admin_actions aa
                    JOIN users u ON u.id = aa.admin_id
                    ORDER BY aa.created_at DESC
                    LIMIT %s
                """, (limit,))
                actions = cur.fetchall()
                conn.close()
                
                result = []
                for action in actions:
                    action_dict = dict(action)
                    if action_dict.get('created_at'):
                        action_dict['created_at'] = action_dict['created_at'].isoformat()
                    result.append(action_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            action = data.get('action')
            
            if action == 'block_user':
                user_id = data.get('user_id')
                reason = data.get('reason', '').strip()
                
                if not user_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE users SET is_blocked = true, blocked_by = %s, blocked_at = NOW(), blocked_reason = %s WHERE id = %s",
                    (admin_id, reason, user_id)
                )
                
                cur.execute(
                    "INSERT INTO admin_actions (admin_id, action_type, target_user_id, details) VALUES (%s, %s, %s, %s)",
                    (admin_id, 'block_user', user_id, json.dumps({'reason': reason}))
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'User blocked'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'unblock_user':
                user_id = data.get('user_id')
                
                if not user_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE users SET is_blocked = false, blocked_by = NULL, blocked_at = NULL, blocked_reason = NULL WHERE id = %s",
                    (user_id,)
                )
                
                cur.execute(
                    "INSERT INTO admin_actions (admin_id, action_type, target_user_id) VALUES (%s, %s, %s)",
                    (admin_id, 'unblock_user', user_id)
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'User unblocked'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'block_ip':
                ip_address = data.get('ip_address', '').strip()
                reason = data.get('reason', '').strip()
                
                if not ip_address:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'ip_address is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO ip_blocks (ip_address, blocked_by, reason) VALUES (%s, %s, %s) ON CONFLICT (ip_address) DO UPDATE SET is_active = true, blocked_at = NOW()",
                    (ip_address, admin_id, reason)
                )
                
                cur.execute(
                    "INSERT INTO admin_actions (admin_id, action_type, target_ip, details) VALUES (%s, %s, %s, %s)",
                    (admin_id, 'block_ip', ip_address, json.dumps({'reason': reason}))
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'IP blocked'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'unblock_ip':
                ip_address = data.get('ip_address', '').strip()
                
                if not ip_address:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'ip_address is required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE ip_blocks SET is_active = false WHERE ip_address = %s",
                    (ip_address,)
                )
                
                cur.execute(
                    "INSERT INTO admin_actions (admin_id, action_type, target_ip) VALUES (%s, %s, %s)",
                    (admin_id, 'unblock_ip', ip_address)
                )
                
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'IP unblocked'}),
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
