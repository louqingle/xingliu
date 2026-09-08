"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function makeEmail(username: string) {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${safe || "user"}@xingliu.app`;
}

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "账号或密码不正确";
  if (/email not confirmed/i.test(message)) return "账号还没有完成邮箱验证";
  if (/user already registered/i.test(message)) return "这个账号已经注册过了";
  if (/password should be at least/i.test(message)) return "密码长度不够";
  if (/rate limit/i.test(message)) return "操作太频繁，请稍后再试";
  return message || "操作失败，请稍后再试";
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) router.replace("/");
    });
    return () => { alive = false; };
  }, [router]);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    const cleanUsername = username.trim();
    const cleanNickname = nickname.trim();

    if (!supabase) {
      setError("登录服务未配置，请检查 Vercel 环境变量。");
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(cleanUsername)) {
      setError("账号用 3–20 位字母、数字、下划线或短横线即可");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (mode === "register") {
      if (cleanNickname.length < 2) {
        setError("昵称至少 2 个字");
        return;
      }
      if (cleanNickname.length > 20) {
        setError("昵称最多 20 个字符");
        return;
      }
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
    }

    setLoading(true);
    try {
      const email = makeEmail(cleanUsername);

      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const id = data.user?.id;
        if (!id) throw new Error("注册失败，请稍后再试");

        const { error: profileError } = await supabase.from("profiles").upsert({
          id,
          username: cleanUsername,
          display_name: cleanNickname,
        });
        if (profileError) throw profileError;

        if (data.session) {
          router.replace("/");
          return;
        }

        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setSuccess("账号创建成功，现在直接登录即可");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "操作失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page-v2">
      <style jsx global>{`
        .auth-page-v2{min-height:100dvh;overflow:auto;background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px 18px;position:relative;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
        .auth-page-v2:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 15%,#292929 0,transparent 36%),radial-gradient(circle at 15% 90%,#151515 0,transparent 30%);pointer-events:none}
        .auth-card-v2{position:relative;width:min(430px,100%);padding:28px 24px 22px;border:1px solid #ffffff12;border-radius:26px;background:#0d0d0de8;box-shadow:0 30px 100px #000;backdrop-filter:blur(24px)}
        .auth-brand-v2{display:flex;align-items:center;gap:11px;margin-bottom:28px}
        .auth-mark-v2{width:42px;height:42px;border-radius:13px;background:#fff;color:#000;display:grid;place-items:center;box-shadow:0 8px 30px #fff2}
        .auth-brand-v2 strong{font-size:21px;letter-spacing:-.5px}.auth-brand-v2 span{display:block;color:#666;font-size:11px;margin-top:2px}
        .auth-switch-v2{display:grid;grid-template-columns:1fr 1fr;background:#171717;border-radius:12px;padding:4px;margin-bottom:25px}
        .auth-switch-v2 button{height:40px;border-radius:9px;color:#777;font-weight:700}.auth-switch-v2 button.active{background:#fff;color:#000;box-shadow:0 4px 16px #0008}
        .auth-title-v2 h1{font-size:27px;letter-spacing:-.8px;margin:0}.auth-title-v2 p{color:#777;font-size:13px;margin:8px 0 23px}
        .auth-field-v2{margin-bottom:15px}.auth-field-v2 label{display:block;font-size:12px;color:#aaa;margin:0 0 7px 2px;font-weight:700}.auth-input-v2{height:52px;width:100%;border:1px solid #252525;background:#141414;border-radius:13px;color:#fff;outline:none;padding:0 14px;transition:.15s}.auth-input-v2:focus{border-color:#777;background:#171717;box-shadow:0 0 0 3px #fff0a}.auth-input-v2::placeholder{color:#555}.auth-password-v2{position:relative}.auth-password-v2 input{padding-right:48px}.auth-eye-v2{position:absolute;right:5px;top:5px;width:42px;height:42px;display:grid;place-items:center;color:#777}
        .auth-message-v2{border-radius:11px;padding:11px 12px;font-size:12px;line-height:1.5;margin:3px 0 13px}.auth-error-v2{background:#291315;color:#ff9a9f;border:1px solid #632a30}.auth-success-v2{background:#122419;color:#8ee5aa;border:1px solid #234f31}
        .auth-submit-v2{height:53px;width:100%;border-radius:13px;background:#fff;color:#000;font-weight:850;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:.18s}.auth-submit-v2:active{transform:scale(.985)}.auth-submit-v2:disabled{opacity:.45}
        .auth-trust-v2{display:flex;align-items:center;justify-content:center;gap:6px;color:#555;font-size:11px;margin:17px 0 0}.auth-trust-v2 svg{color:#777}
        .auth-tip-v2{text-align:center;color:#444;font-size:10px;line-height:1.6;margin:17px 10px 0}
        @media(max-width:480px){.auth-page-v2{align-items:flex-start;padding:20px 14px}.auth-card-v2{margin-top:7vh;padding:24px 18px 20px;border-radius:22px}.auth-title-v2 h1{font-size:25px}}
      `}</style>

      <section className="auth-card-v2" aria-label="星流账号登录">
        <div className="auth-brand-v2">
          <div className="auth-mark-v2"><Sparkles size={20}/></div>
          <div><strong>星流</strong><span>发现值得被看见的瞬间</span></div>
        </div>

        <div className="auth-switch-v2">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button>
        </div>

        <div className="auth-title-v2">
          <h1>{mode === "login" ? "欢迎回来" : "创建你的星流账号"}</h1>
          <p>{mode === "login" ? "继续刷视频、关注创作者、和朋友聊天" : "注册只需要一个账号和密码"}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && <div className="auth-field-v2"><label htmlFor="nickname">昵称</label><input className="auth-input-v2" id="nickname" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="例如：庆乐" maxLength={20} autoComplete="nickname" /></div>}
          <div className="auth-field-v2"><label htmlFor="username">账号</label><input className="auth-input-v2" id="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="3–20 位字母、数字或符号" autoComplete="username" autoCapitalize="none" spellCheck={false} /></div>
          <div className="auth-field-v2"><label htmlFor="password">密码</label><div className="auth-password-v2"><input className="auth-input-v2" id="password" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 6 位" autoComplete={mode === "login" ? "current-password" : "new-password"}/><button className="auth-eye-v2" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label="显示或隐藏密码">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
          {mode === "register" && <div className="auth-field-v2"><label htmlFor="confirm-password">确认密码</label><div className="auth-password-v2"><input className="auth-input-v2" id="confirm-password" type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="再次输入密码" autoComplete="new-password"/><button className="auth-eye-v2" type="button" onClick={()=>setShowConfirm(v=>!v)} aria-label="显示或隐藏确认密码">{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>}
          {error && <div className="auth-message-v2 auth-error-v2" role="alert">{error}</div>}
          {success && <div className="auth-message-v2 auth-success-v2" role="status">{success}</div>}
          <button className="auth-submit-v2" type="submit" disabled={loading}>{loading ? "正在验证…" : mode === "login" ? <>登录星流 <ArrowRight size={17}/></> : <>创建账号 <ArrowRight size={17}/></>}</button>
        </form>

        <div className="auth-trust-v2"><ShieldCheck size={14}/> 登录状态安全保存到你的设备</div>
        <p className="auth-tip-v2">星流账号用于同步你的关注、作品、点赞、评论和私信数据。</p>
      </section>
    </main>
  );
}
