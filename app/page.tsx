"use client";

import { useEffect, useRef, useState } from "react";

type VideoItem = {
  id: number;
  src: string;
  username: string;
  title: string;
  music: string;
  likes: number;
  comments: number;
};

const videos: VideoItem[] = [
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
  const feedRef = useRef<HTMLDivElement | null>(null);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [likedIds, setLikedIds] = useState<number[]>([]);

  const [followedIds, setFollowedIds] = useState<number[]>([]);

  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed) return;

    const handleScroll = () => {
      const height = window.innerHeight;

      if (!height) return;

      const index = Math.round(feed.scrollTop / height);

      setCurrentIndex(index);
    };

    feed.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      feed.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      video.muted = muted;

      if (index === currentIndex) {
        video
          .play()
          .catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, muted]);

  function toggleLike(id: number) {
    setLikedIds((old) => {
      if (old.includes(id)) {
        return old.filter((item) => item !== id);
      }

      return [...old, id];
    });
  }

  function toggleFollow(id: number) {
    setFollowedIds((old) => {
      if (old.includes(id)) {
        return old.filter((item) => item !== id);
      }

      return [...old, id];
    });
  }

  function goProfile() {
    const user = localStorage.getItem(
      "xingliu-current-user"
    );

    if (user) {
      window.location.href = "/profile";
    } else {
      window.location.href = "/auth";
    }
  }

  function goAuth() {
    window.location.href = "/auth";
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
          outline: 0;
          padding: 0;
          margin: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .xingliu-app {
          position: fixed;
          inset: 0;

          width: 100%;
          height: 100dvh;

          overflow: hidden;

          background: #000;
          color: #fff;
        }

        /* =========================
           视频流
        ========================= */

        .video-feed {
          width: 100%;
          height: 100dvh;

          overflow-y: scroll;
          overflow-x: hidden;

          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;

          overscroll-behavior-y: contain;

          scrollbar-width: none;
        }

        .video-feed::-webkit-scrollbar {
          display: none;
        }

        .video-page {
          position: relative;

          width: 100%;
          height: 100dvh;

          overflow: hidden;

          scroll-snap-align: start;
          scroll-snap-stop: always;

          background: #111;
        }

        .video-player {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          background: #111;
        }

        /* =========================
           遮罩
        ========================= */

        .top-gradient {
          position: absolute;

          top: 0;
          left: 0;
          right: 0;

          height: 190px;

          pointer-events: none;

          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.6),
            rgba(0, 0, 0, 0)
          );
        }

        .bottom-gradient {
          position: absolute;

          left: 0;
          right: 0;
          bottom: 0;

          height: 390px;

          pointer-events: none;

          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.88),
            rgba(0, 0, 0, 0.42) 48%,
            rgba(0, 0, 0, 0)
          );
        }

        /* =========================
           顶部
        ========================= */

        .top-bar {
          position: fixed;

          z-index: 100;

          top: 0;
          left: 0;
          right: 0;

          height: 72px;

          display: flex;
          align-items: flex-end;
          justify-content: center;

          padding-bottom: 15px;
          padding-top: env(safe-area-inset-top);

          pointer-events: none;
        }

        .top-tabs {
          display: flex;
          align-items: center;
          gap: 28px;

          pointer-events: auto;
        }

        .top-tab {
          position: relative;

          color: rgba(255, 255, 255, 0.65);

          font-size: 16px;
          font-weight: 600;

          text-shadow:
            0 1px 4px rgba(0, 0, 0, 0.8);
        }

        .top-tab.active {
          color: #fff;
          font-weight: 800;
        }

        .top-tab.active::after {
          content: "";

          position: absolute;

          left: 50%;
          bottom: -10px;

          width: 23px;
          height: 3px;

          border-radius: 99px;

          background: #fff;

          transform: translateX(-50%);
        }

        .search-button {
          position: absolute;

          right: 16px;
          bottom: 13px;

          width: 38px;
          height: 38px;

          display: grid;
          place-items: center;

          color: #fff;

          font-size: 27px;

          text-shadow:
            0 2px 5px rgba(0, 0, 0, 0.8);

          pointer-events: auto;
        }

        /* =========================
           静音
        ========================= */

        .sound-button {
          position: absolute;

          z-index: 30;

          top: 82px;
          right: 16px;

          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: rgba(0, 0, 0, 0.35);

          backdrop-filter: blur(8px);

          font-size: 20px;

          box-shadow:
            0 2px 10px rgba(0, 0, 0, 0.25);
        }

        /* =========================
           右侧操作
        ========================= */

        .action-bar {
          position: absolute;

          z-index: 30;

          right: 9px;
          bottom: 115px;

          width: 58px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 20px;
        }

        .action-button {
          width: 58px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 4px;

          text-shadow:
            0 2px 5px rgba(0, 0, 0, 0.9);
        }

        .action-icon {
          width: 49px;
          height: 49px;

          display: grid;
          place-items: center;

          font-size: 31px;

          transition:
            transform 0.15s ease,
            color 0.15s ease;
        }

        .action-count {
          font-size: 11px;
          line-height: 15px;

          color: #fff;
        }

        .like-icon {
          font-size: 35px;
        }

        .like-icon.liked {
          color: #ff2d55;

          transform: scale(1.18);
        }

        .music-disc {
          width: 49px;
          height: 49px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          border: 3px solid rgba(255, 255, 255, 0.95);

          background:
            radial-gradient(
              circle,
              #111 0 18%,
              #777 19% 25%,
              #111 26% 100%
            );

          font-size: 20px;

          animation: rotateDisc 4s linear infinite;
        }

        @keyframes rotateDisc {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           视频信息
        ========================= */

        .video-info {
          position: absolute;

          z-index: 30;

          left: 15px;
          right: 80px;
          bottom: 88px;
        }

        .author-row {
          display: flex;
          align-items: center;

          gap: 9px;
        }

        .avatar {
          flex: 0 0 auto;

          width: 44px;
          height: 44px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: #fff;
          color: #111;

          border: 2px solid rgba(255, 255, 255, 0.9);

          font-size: 18px;
          font-weight: 900;
        }

        .author-name {
          max-width: 145px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-size: 15px;
          font-weight: 800;

          text-shadow:
            0 2px 5px rgba(0, 0, 0, 0.9);
        }

        .follow-button {
          min-width: 54px;
          height: 28px;

          padding: 0 10px;

          border:
            1px solid rgba(255, 255, 255, 0.9);

          border-radius: 5px;

          color: #fff;

          background: rgba(0, 0, 0, 0.15);

          backdrop-filter: blur(5px);

          font-size: 12px;
          font-weight: 700;
        }

        .follow-button.followed {
          opacity: 0.65;
        }

        .video-title {
          margin-top: 13px;

          font-size: 15px;
          line-height: 1.5;

          font-weight: 500;

          text-shadow:
            0 2px 6px rgba(0, 0, 0, 0.9);
        }

        .music-name {
          display: flex;
          align-items: center;

          gap: 5px;

          margin-top: 7px;

          max-width: 100%;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-size: 13px;

          text-shadow:
            0 2px 5px rgba(0, 0, 0, 0.9);
        }

        /* =========================
           底部导航
        ========================= */

        .bottom-nav {
          position: fixed;

          z-index: 200;

          left: 0;
          right: 0;
          bottom: 0;

          height: 67px;

          display: flex;
          align-items: center;
          justify-content: space-around;

          padding-bottom: env(safe-area-inset-bottom);

          background: rgba(0, 0, 0, 0.94);

          backdrop-filter: blur(10px);
        }

        .nav-button {
          width: 58px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 3px;

          color: rgba(255, 255, 255, 0.58);
        }

        .nav-button.active {
          color: #fff;
        }

        .nav-icon {
          height: 24px;

          display: flex;
          align-items: center;

          font-size: 23px;
          line-height: 1;
        }

        .nav-label {
          font-size: 10px;
          line-height: 14px;
        }

        .publish-button {
          width: 49px;
          height: 35px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background: #fff;
          color: #000;

          font-size: 30px;
          font-weight: 300;

          box-shadow:
            -5px 0 0 rgba(255, 255, 255, 0.35),
            5px 0 0 rgba(255, 255, 255, 0.9);
        }

        /* =========================
           PC
        ========================= */

        @media (min-width: 700px) {
          .xingliu-app {
            left: 50%;
            right: auto;

            width: 430px;

            transform: translateX(-50%);

            box-shadow:
              0 0 100px rgba(0, 0, 0, 0.8);
          }

          .top-bar {
            left: 50%;

            width: 430px;

            transform: translateX(-50%);
          }

          .bottom-nav {
            left: 50%;

            width: 430px;

            transform: translateX(-50%);
          }
        }
      `}</style>

      <main className="xingliu-app">

        {/* =========================
            顶部导航
        ========================= */}

        <header className="top-bar">

          <div className="top-tabs">

            <button className="top-tab">
              关注
            </button>

            <button className="top-tab active">
              推荐
            </button>

          </div>

          <button
            className="search-button"
            aria-label="搜索"
            onClick={() => {
              alert("搜索功能即将上线");
            }}
          >
            ⌕
          </button>

        </header>


        {/* =========================
            视频流
        ========================= */}

        <div
          ref={feedRef}
          className="video-feed"
        >

          {videos.map((video, index) => {

            const isLiked =
              likedIds.includes(video.id);

            const isFollowed =
              followedIds.includes(video.id);

            return (
              <section
                key={video.id}
                className="video-page"
              >

                <video
                  ref={(element) => {
                    videoRefs.current[index] =
                      element;
                  }}
                  className="video-player"
                  src={video.src}
                  muted={muted}
                  loop
                  playsInline
                  preload="metadata"
                  autoPlay={index === 0}
                />


                <div className="top-gradient" />

                <div className="bottom-gradient" />


                {/* 静音 */}

                <button
                  className="sound-button"
                  aria-label="声音"
                  onClick={() => {
                    setMuted((value) => !value);
                  }}
                >
                  {muted ? "🔇" : "🔊"}
                </button>


                {/* =========================
                    右侧操作栏
                ========================= */}

                <aside className="action-bar">

                  <button
                    className="action-button"
                    onClick={() => {
                      toggleLike(video.id);
                    }}
                  >

                    <span
                      className={
                        isLiked
                          ? "action-icon like-icon liked"
                          : "action-icon like-icon"
                      }
                    >
                      ♥
                    </span>

                    <span className="action-count">
                      {video.likes +
                        (isLiked ? 1 : 0)}
                    </span>

                  </button>


                  <button
                    className="action-button"
                    onClick={() => {
                      alert("评论功能即将上线");
                    }}
                  >

                    <span className="action-icon">
                      💬
                    </span>

                    <span className="action-count">
                      {video.comments}
                    </span>

                  </button>


                  <button
                    className="action-button"
                    onClick={() => {
                      alert("分享功能即将上线");
                    }}
                  >

                    <span className="action-icon">
                      ↗
                    </span>

                    <span className="action-count">
                      分享
                    </span>

                  </button>


                  <div className="music-disc">
                    ♪
                  </div>

                </aside>


                {/* =========================
                    视频信息
                ========================= */}

                <div className="video-info">

                  <div className="author-row">

                    <div className="avatar">
                      {video.username.slice(0, 1)}
                    </div>

                    <span className="author-name">
                      @{video.username}
                    </span>

                    <button
                      className={
                        isFollowed
                          ? "follow-button followed"
                          : "follow-button"
                      }
                      onClick={() => {
                        toggleFollow(video.id);
                      }}
                    >
                      {isFollowed
                        ? "已关注"
                        : "关注"}
                    </button>

                  </div>


                  <div className="video-title">
                    {video.title}
                  </div>


                  <div className="music-name">
                    ♪ {video.music}
                  </div>

                </div>

              </section>
            );
          })}

        </div>


        {/* =========================
            底部导航
        ========================= */}

        <nav className="bottom-nav">

          <button
            className="nav-button active"
            onClick={() => {
              feedRef.current?.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            <span className="nav-icon">
              ⌂
            </span>

            <span className="nav-label">
              首页
            </span>
          </button>


          <button
            className="nav-button"
            onClick={() => {
              alert("朋友功能即将上线");
            }}
          >
            <span className="nav-icon">
              ◎
            </span>

            <span className="nav-label">
              朋友
            </span>
          </button>


          <button
            className="publish-button"
            aria-label="发布"
            onClick={() => {
              const user =
                localStorage.getItem(
                  "xingliu-current-user"
                );

              if (!user) {
                goAuth();
                return;
              }

              alert("视频发布功能马上上线");
            }}
          >
            +
          </button>


          <button
            className="nav-button"
            onClick={() => {
              alert("消息功能即将上线");
            }}
          >
            <span className="nav-icon">
              ♧
            </span>

            <span className="nav-label">
              消息
            </span>
          </button>


          <button
            className="nav-button"
            onClick={goProfile}
          >
            <span className="nav-icon">
              ◉
            </span>

            <span className="nav-label">
              我
            </span>
          </button>

        </nav>

      </main>
    </>
  );
}
