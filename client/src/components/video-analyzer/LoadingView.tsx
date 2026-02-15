export function LoadingView() {
  return (
    <div className="va-loading">
      <div className="va-spinner">
        <span className="va-leaf va-leaf--1">&#x1F33F;</span>
        <span className="va-leaf va-leaf--2">&#x1F33F;</span>
        <span className="va-leaf va-leaf--3">&#x1F33F;</span>
      </div>
      <p className="va-loading-text">Analyzing your video...</p>
      <p className="va-loading-sub">This may take a minute</p>
    </div>
  );
}
