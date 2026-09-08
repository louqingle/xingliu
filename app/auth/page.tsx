"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function makeEmail(username: string) {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${safe || "user"}@xingliu.app`;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) router.replace("/");
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");

    const cleanUsername = username.trim();
    const cleanNickname = nickname.trim();

    if (!supabase) {
      setError("登录服务尚未配置，请检查 Vercel 环境变量。");
      return;
    }
    if (cleanUsername.length < 3) {
      setError("账号至少需要 3 个字符。");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 个字符。");
      return;
    }
    if (mode === "register") {
      if (!cleanNickname) {
        setError("请输入昵称。");
        return;
      }
      if (cleanNickname.length > 20) {
        setError("昵称最多 20 个字符。");
        return;
      }
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致。");
        return;
      }
    }

    setLoading(true);
    try {
      const email = makeEmail(cleanUsername);

      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        const id = data.user?.id;
        if (!id) throw new Error("注册失败，请稍后重试。");

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
        setError("账号创建成功，请登录进入星流。");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败，请稍后重试。";
      if (/invalid login credentials/i.test(message)) {
        setError("账号或密码不正确，请检查后重试。");
      } else if (/user already registered/i.test(message)) {
        setError("这个账号已经注册过了，请直接登录。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-box" aria-label="星流账号">
        <div className="auth-brand">
          <div className="auth-logo-mark"><Sparkles size={20} /></div>
          <div>
            <div className="auth-logo">星流</div>
            <div className="auth-subtitle">发现值得被看见的瞬间</div>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button>
        </div>

        <div className="auth-heading">
          <h1>{mode === "login" ? "欢迎回来" : "加入星流"}</h1>
          <p>{mode === "login" ? "登录后继续刷你喜欢的视频" : "创建一个账号，开始你的星流之旅"}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="field">
              <label htmlFor="nickname">昵称</label>
              <input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="给自己取一个名字" maxLength={20} autoComplete="nickname" />
            </div>
          )}

          <div className="field">
            <label htmlFor="username">账号</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </div>

          <div className="field">
            <label htmlFor="password">密码</label>
            <div className="password-wrap">
              <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位密码" autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" className="password-eye" aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
            </div>
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="confirm-password">确认密码</label>
              <div className="password-wrap">
                <input id="confirm-password" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再输入一次密码" autoComplete="new-password" />
                <button type="button" className="password-eye" aria-label={showConfirm ? "隐藏确认密码" : "显示确认密码"} onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </div>
          )}

          {error && <div className={`auth-error ${error.includes("成功") ? "success" : ""}`} role="alert">{error}</div>}

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "正在进入…" : mode === "login" ? "登录星流" : "创建星流账号"}
          </button>
        </form>

        <p className="auth-tip">账号数据同步到云端，换设备也可以继续使用。</p>
      </section>
    </main>
  );
}
