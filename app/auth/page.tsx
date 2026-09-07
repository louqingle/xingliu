"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  username: string;
  nickname: string;
  password: string;
};

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = localStorage.getItem("xingliu-current-user");

    if (currentUser) {
      router.replace("/");
    }
  }, [router]);

  function getUsers(): User[] {
    try {
      return JSON.parse(
        localStorage.getItem("xingliu-users") || "[]"
      );
    } catch {
      return [];
    }
  }

  function saveUsers(users: User[]) {
    localStorage.setItem(
      "xingliu-users",
      JSON.stringify(users)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 400)
    );

    const users = getUsers();

    if (mode === "register") {
      if (!nickname.trim()) {
        setError("请输入昵称");
        setLoading(false);
        return;
      }

      if (username.trim().length < 3) {
        setError("账号至少需要 3 个字符");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("密码至少需要 6 个字符");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        setLoading(false);
        return;
      }

      const exists = users.some(
        (user) =>
          user.username.toLowerCase() ===
          username.trim().toLowerCase()
      );

      if (exists) {
        setError("这个账号已经注册过了");
        setLoading(false);
        return;
      }

      const newUser: User = {
        username: username.trim(),
        nickname: nickname.trim(),
        password,
      };

      users.push(newUser);
      saveUsers(users);

      localStorage.setItem(
        "xingliu-current-user",
        JSON.stringify({
          username: newUser.username,
          nickname: newUser.nickname,
        })
      );

      router.replace("/");
      return;
    }

    const user = users.find(
      (item) =>
        item.username.toLowerCase() ===
          username.trim().toLowerCase() &&
        item.password === password
    );

    if (!user) {
      setError("账号或密码错误");
      setLoading(false);
      return;
    }

    localStorage.setItem(
      "xingliu-current-user",
      JSON.stringify({
        username: user.username,
        nickname: user.nickname,
      })
    );

    router.replace("/");
  }

  return (
    <main className="auth-page">

      <div className="auth-box">

        <div className="auth-logo">
          星流
        </div>

        <div className="auth-subtitle">
          发现有趣短视频
        </div>

        <div className="auth-tabs">

          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            登录
          </button>

          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            注册
          </button>

        </div>

        <form onSubmit={handleSubmit}>

          {mode === "register" && (
            <div className="field">

              <label>
                昵称
              </label>

              <input
                value={nickname}
                onChange={(e) =>
                  setNickname(e.target.value)
                }
                placeholder="请输入昵称"
                maxLength={20}
              />

            </div>
          )}

          <div className="field">

            <label>
              账号
            </label>

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="请输入账号"
              autoComplete="username"
            />

          </div>

          <div className="field">

            <label>
              密码
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="请输入密码"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />

          </div>

          {mode === "register" && (
            <div className="field">

              <label>
                确认密码
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="再次输入密码"
                autoComplete="new-password"
              />

            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "处理中..."
              : mode === "login"
                ? "登录星流"
                : "创建账号"}
          </button>

        </form>

        <div className="auth-tip">
          {mode === "login"
            ? "还没有账号？点击上方「注册」"
            : "已经有账号？点击上方「登录」"}
        </div>

      </div>

    </main>
  );
}
