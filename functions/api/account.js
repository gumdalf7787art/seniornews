import { audit, json, requireUser, verifyMutationRequest } from './utils/auth.js';
import { hashPassword, verifyPassword } from './utils/password.js';

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, provider: user.provider };
}

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context);
  if (auth.error) return auth.error;

  try {
    const data = await context.request.json();
    if (data.action === 'profile') {
      const name = String(data.name || '').trim();
      if (name.length < 2 || name.length > 40) return json({ message: '이름은 2~40자로 입력해 주세요.' }, 400);
      await context.env.DB.prepare('UPDATE users SET name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(name, auth.user.id).run();
      const user = { ...auth.user, name };
      await audit(context.env, auth.user.id, 'account_name_updated', 'user', auth.user.id, { name });
      return json({ success: true, user: publicUser(user) });
    }

    if (data.action === 'password') {
      const currentPassword = String(data.currentPassword || '');
      const newPassword = String(data.newPassword || '');
      if (!auth.user.password_hash) return json({ message: 'SNS 로그인 계정은 비밀번호를 변경할 수 없습니다.' }, 400);
      if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return json({ message: '새 비밀번호는 영문·숫자를 포함해 10자 이상 입력해 주세요.' }, 400);
      if (currentPassword === newPassword) return json({ message: '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.' }, 400);
      if (!await verifyPassword(currentPassword, auth.user.password_hash)) return json({ message: '현재 비밀번호가 올바르지 않습니다.' }, 400);
      await context.env.DB.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(await hashPassword(newPassword), auth.user.id).run();
      await audit(context.env, auth.user.id, 'account_password_updated', 'user', auth.user.id);
      return json({ success: true });
    }

    return json({ message: '지원하지 않는 변경 요청입니다.' }, 400);
  } catch (error) {
    console.error('account_update_failed', error instanceof Error ? error.message : String(error));
    return json({ message: '계정 정보를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}
