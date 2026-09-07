"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  username: string;
  nickname: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("xingliu-current-user");

    if (!saved) {
      router.replace("/auth");
      return;
    }

    try {
      setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("xingliu-current-user");
      router.replace("/auth");
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("xingliu-current-user");
    router.replace("/");
  }

  if (!user) {
    return (
      <main className="profile-loading">
        加载中...
      </main>
    );
  }

  return (
    <main className="profile-page">

      <header className="profile-header">
        <button
          className="back-button"
          onClick={() => router.push("/")}
        >
          ‹
        </button>

        <strong>个人主页</strong>

        <button className="more-button">
          ···
        </button>
      </header>

      <section className="profile-top">

        <div className="profile-avatar">
          {user.nickname.slice(0, 1)}
        </div>

        <h1>{user.nickname}</h1>

        <p>@{user.username}</p>

        <button className="edit-button">
          编辑资料
        </button>

      </section>

      <section className="stats">

        <div>
          <strong>0</strong>
          <span>关注</span>
        </div>

        <div>
          <strong>0</strong>
          <span>粉丝</span>
        </div>

        <div>
          <strong>0</strong>
          <span>获赞</span>
        </div>

      </section>

      <section className="profile-tabs">

        <button className="active">
          作品
        </button>

        <button>
          私藏
        </button>

        <button>
          点赞
        </button>

      </section>

      <section className="empty-content">

        <div className="empty-icon">
          ＋
        </div>

        <h2>还没有作品</h2>

        <p>
          发布你的第一个视频吧
        </p>

        <button
          className="publish-button"
          onClick={() => router.push("/upload")}
        >
          发布视频
        </button>

      </section>

      <button
        className="logout-button"
        onClick={logout}
      >
        退出登录
      </button>

    </main>
  );
}
