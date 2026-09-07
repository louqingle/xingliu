"use client";

import { useEffect, useRef, useState } from "react";

const videos = [
  {
    id: 1,
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    username: "星流用户",
    title: "欢迎来到星流 ✨",
    music: "原创音乐 · 星流",
    likes: 1280,
    comments: 86,
  },
  {
    id: 2,
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    username: "小星",
    title: "记录生活中的每一个瞬间",
    music: "星流音乐",
    likes: 2356,
    comments: 132,
  },
];

export default function Home() {
  const feedRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      video.muted = muted;

      if (index === current) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [current, muted]);

  function toggleLike(id: number) {
    setLiked((old) =>
      old.includes(id)
        ? old.filter((item) => item !== id)
        : [...old, id]
    );
  }

  function toggleFollow(id: number) {
    setFollowed((old) =>
      old.includes(id)
        ? old.filter((item) => item !== id)
        : [...old, id]
    );
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #000;
        }

        body {
          overflow: hidden;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "PingFang SC",
            "Microsoft YaHei",
            sans-serif;
        }

        button {
          border: 0;
          background: transparent;
          color: #fff;
          padding: 0;
          font: inherit;
        }

        .xingliu {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          background: #000;
          color: #fff;
          overflow: hidden;
        }

        .feed {
          width: 100%;
          height: 100%;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          overscroll-behavior-y: contain;
          scrollbar-width: none;
        }

        .feed::-webkit-scrollbar {
          display: none;
        }

        .page {
          position: relative;
          width: 100%;
          height: 100dvh;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          overflow: hidden;
          background: #111;
        }

        .video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #111;
        }

        .top-gradient {
          position: absolute;
          inset: 0 0 auto 0;
          height: 180px;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,.55),
            rgba(0,0,0,0)
          );
        }

        .bottom-gradient {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 380px;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(0,0,0,.85),
            rgba(0,0,0,.35) 45%,
            rgba(0,0,0,0)
          );
        }

        /* 顶部 */

        .header {
          position: fixed;
          z-index: 100;
          top: 0;
          left: 0;
          right: 0;

          height: 68px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding-top: env(safe-area-inset-top);
        }

        .header-inner {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .header-item {
          position: relative;
          color: rgba(255,255,255,.65);
          font-size: 16px;
          font-weight: 600;
          text-shadow: 0 1px 4px #000;
        }

        .header-item.active {
          color: #fff;
          font-weight: 800;
        }

        .header-item.active::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -9px;
          width: 22px;
          height: 3px;
          border-radius: 99px;
          background: #fff;
          transform: translateX(-50%);
        }

        .search-button {
          position: absolute;
          right: 17px;
          top: 17px;

          width: 34px;
          height: 34px;

          display: grid;
          place-items: center;

          font-size: 23px;
          text-shadow: 0 1px 5px #000;
        }

        /* 右侧 */

        .side {
          position: absolute;
          z-index: 20;

          right: 10px;
          bottom: 112px;

          width: 58px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 21px;
        }

        .side-button {
          width: 55px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 4px;

          text-shadow: 0 2px 5px #000;
        }

        .side-icon {
          width: 47px;
          height: 47px;

          display: grid;
          place-items: center;

          font-size: 31px;
          font-weight: 400;
        }

        .side-count {
          font-size: 11px;
          font-weight: 500;
        }

        .heart {
          transition: transform .15s;
        }

        .heart.liked {
          color: #ff2d55;
          transform: scale(1.15);
        }

        .music-disc {
          width: 48px;
          height: 48px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              #111 0 20%,
              #777 21% 27%,
              #111 28% 100%
            );

          border: 3px solid rgba(255,255,255,.9);

          font-size: 18px;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* 左下 */

        .content {
          position: absolute;
          z-index: 20;

          left: 15px;
          right: 78px;
          bottom: 92px;
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: #fff;
          color: #111;

          font-size: 17px;
          font-weight: 900;

          border: 2px solid rgba(255,255,255,.8);
        }

        .username {
          font-size: 15px;
          font-weight: 800;
          text-shadow: 0 1px 4px #000;
        }

        .follow {
          margin-left: 3px;

          min-width: 54px;
          height: 27px;

          padding: 0 10px;

          border: 1px solid rgba(255,255,255,.9);
          border-radius: 5px;

          font-size: 12px;
          font-weight: 700;

          background: rgba(255,255,255,.08);
          backdrop-filter: blur(5px);
        }

        .follow.active {
          opacity: .65;
        }

        .title {
          margin: 13px 0 7px;

          font-size: 15px;
          line-height: 1.45;
          font-weight: 500;

          text-shadow: 0 1px 5px #000;
        }

        .music {
          display: flex;
          align-items: center;
          gap: 5px;

          font-size: 13px;
          font-weight: 500;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          text-shadow: 0 1px 5px #000;
        }

        /* 底部 */

        .bottom {
          position: fixed;
          z-index: 100;

          left: 0;
          right: 0;
          bottom: 0;

          height: 63px;

          display: flex;
          align-items: center;
          justify-content: space-around;

          padding-bottom: env(safe-area-inset-bottom);

          background: rgba(0,0,0,.94);
        }

        .nav {
          min-width: 55px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 3px;

          color: rgba(255,255,255,.65);
        }

        .nav.active {
          color: #fff;
        }

        .nav-icon {
          font-size: 22px;
          line-height: 22px;
        }

        .nav-text {
          font-size: 10px;
        }

        .publish {
          width: 48px;
          height: 34px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background: #fff;
          color: #000;

          font-size: 29px;
          font-weight: 300;

          box-shadow:
            -5px 0 0 #555,
            5px 0 0 #fff;
        }

        /* 声音 */

        .sound {
          position: absolute;
          z-index: 30;

          right: 16px;
          top: 77px;

          width: 35px;
          height: 35px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: rgba(0,0,0,.35);

          backdrop-filter: blur(8px);

          font-size: 17px;
        }

        @media (min-width: 700px) {
          .xingliu {
            width: 430px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);

            box-shadow:
              0 0 80px rgba(0,0,0,.8);
          }

          .header {
            width: 430px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
          }

          .bottom {
            width: 430px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
          }
        }
      `}</style>

      <main className="xingliu">

        <header className="header">

          <div className="header-inner">

            <button className="header-item">
              关注
            </button>

            <button className="header-item active">
              推荐
            </button>

          </div>

          <button className="search-button">
            ⌕
          </button>

        </header>


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
                className="page"
                key={video.id}
              >

                <video
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  className="video"
                  src={video.src}
                  muted={muted}
                  loop
                  playsInline
                  autoPlay={index === 0}
                  preload="metadata"
                />


                <div className="top-gradient" />

                <div className="bottom-gradient" />


                <button
                  className="sound"
                  onClick={() =>
                    setMuted((value) => !value)
                  }
                >
                  {muted ? "🔇" : "🔊"}
                </button>


                {/* 右侧操作 */}

                <div className="side">

                  <button
                    className="side-button"
                    onClick={() =>
                      toggleLike(video.id)
                    }
                  >

                    <span
                      className={
                        isLiked
                          ? "side-icon heart liked"
                          : "side-icon heart"
                      }
                    >
                      ♥
                    </span>

                    <span className="side-count">
                      {video.likes +
                        (isLiked ? 1 : 0)}
                    </span>

                  </button>


                  <button className="side-button">

                    <span className="side-icon">
                      💬
                    </span>

                    <span className="side-count">
                      {video.comments}
                    </span>

                  </button>


                  <button className="side-button">

                    <span className="side-icon">
                      ↗
                    </span>

                    <span className="side-count">
                      分享
                    </span>

                  </button>


                  <div className="music-disc">
                    ♪
                  </div>

                </div>


                {/* 视频信息 */}

                <div className="content">

                  <div className="user-row">

                    <div className="avatar">
                      {video.username.slice(0, 1)}
                    </div>

                    <span className="username">
                      @{video.username}
                    </span>

                    <button
                      className={
                        isFollowed
                          ? "follow active"
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


                  <div className="title">
                    {video.title}
                  </div>


                  <div className="music">
                    ♪ {video.music}
                  </div>

                </div>

              </section>

            );
          })}

        </div>


        {/* 底部导航 */}

        <nav className="bottom">

          <button className="nav active">
            <span className="nav-icon">
              ⌂
            </span>

            <span className="nav-text">
              首页
            </span>
          </button>


          <button className="nav">
            <span className="nav-icon">
              ◎
            </span>

            <span className="nav-text">
              朋友
            </span>
          </button>


          <button className="publish">
            +
          </button>


          <button className="nav">
            <span className="nav-icon">
              ♧
            </span>

            <span className="nav-text">
              消息
            </span>
          </button>


          <button
            className="nav"
            onClick={() => {
              const user =
                localStorage.getItem(
                  "xingliu-current-user"
                );

              if (user) {
                alert("个人中心正在开发中");
              } else {
                window.location.href = "/auth";
              }
            }}
          >
            <span className="nav-icon">
              ◉
            </span>

            <span className="nav-text">
              我
            </span>
          </button>

        </nav>

      </main>
    </>
  );
}
