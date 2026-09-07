"use client";

import { useEffect, useRef, useState } from "react";

const videos = [
  {
    id: 1,
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    user: "星流用户",
    title: "欢迎来到星流 ✨",
    likes: 1280,
    comments: 86,
  },
  {
    id: 2,
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    user: "小星",
    title: "发现生活里的有趣瞬间",
    likes: 2356,
    comments: 132,
  },
];

export default function Home() {
  const feedRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [followed, setFollowed] = useState<number[]>([]);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed) return;

    const handleScroll = () => {
      const index = Math.round(
        feed.scrollTop / window.innerHeight
      );

      setCurrent(index);
    };

    feed.addEventListener("scroll", handleScroll);

    return () => {
      feed.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function toggleLike(id: number) {
    setLiked((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : [...old, id]
    );
  }

  function toggleFollow(id: number) {
    setFollowed((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : [...old, id]
    );
  }

  return (
    <main className="app">

      {/* 顶部 */}

      <header className="top">

        <div className="brand">
          星流
        </div>

        <div className="switch">

          <span>
            关注
          </span>

          <span className="selected">
            推荐
          </span>

        </div>

        <button className="search">
          🔍
        </button>

      </header>


      {/* 视频流 */}

      <div
        ref={feedRef}
        className="feed"
      >

        {videos.map((video, index) => {

          const isLiked =
            liked.includes(video.id);

          const isFollowed =
            followed.includes(video.id);

          return (

            <section
              className="video-page"
              key={video.id}
            >

              <video
                className="video"
                src={video.url}
                autoPlay={index === current}
                muted={muted}
                loop
                playsInline
              />

              {/* 黑色渐变 */}

              <div className="gradient" />


              {/* 点击视频静音 */}

              <button
                className="sound"
                onClick={() =>
                  setMuted(!muted)
                }
              >
                {muted ? "🔇" : "🔊"}
              </button>


              {/* 左下角信息 */}

              <div className="information">

                <div className="user">

                  <div className="avatar">
                    {video.user.slice(0, 1)}
                  </div>

                  <strong>
                    @{video.user}
                  </strong>

                  <button
                    className={
                      isFollowed
                        ? "follow following"
                        : "follow"
                    }
                    onClick={() =>
                      toggleFollow(video.id)
                    }
                  >
                    {isFollowed
                      ? "已关注"
                      : "关注"}
                  </button>

                </div>

                <p className="title">
                  {video.title}
                </p>

                <p className="music">
                  ♫ 原创音乐 · 星流
                </p>

              </div>


              {/* 右侧操作 */}

              <div className="actions">

                <button
                  onClick={() =>
                    toggleLike(video.id)
                  }
                >

                  <span
                    className={
                      isLiked
                        ? "heart liked"
                        : "heart"
                    }
                  >
                    ♥
                  </span>

                  <small>
                    {video.likes +
                      (isLiked ? 1 : 0)}
                  </small>

                </button>


                <button>

                  <span className="icon">
                    💬
                  </span>

                  <small>
                    {video.comments}
                  </small>

                </button>


                <button>

                  <span className="icon">
                    ↗
                  </span>

                  <small>
                    分享
                  </small>

                </button>


                <div className="round-avatar">
                  {video.user.slice(0, 1)}
                </div>

              </div>

            </section>

          );
        })}

      </div>


      {/* 底部导航 */}

      <nav className="bottom">

        <button className="nav active">
          <span>⌂</span>
          <small>首页</small>
        </button>


        <button className="nav">
          <span>◉</span>
          <small>发现</small>
        </button>


        <button className="create">
          +
        </button>


        <button className="nav">
          <span>♡</span>
          <small>消息</small>
        </button>


        <button
  className="nav"
  onClick={() => {
    const user = localStorage.getItem(
      "xingliu-current-user"
    );

    if (user) {
      alert("个人中心正在开发中");
    } else {
      window.location.href = "/auth";
    }
  }}
>
  <span>☺</span>
  <small>我的</small>
</button>

      </nav>

    </main>
  );
}
