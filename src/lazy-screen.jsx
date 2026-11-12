import React, { Component, Suspense } from 'react';

class ScreenLoadError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="screen-load-state" role="alert">
      <p>화면을 불러오지 못했어요.</p>
      <button className="primary" onClick={() => window.location.reload()}>새로고침</button>
      <button className="secondary" onClick={this.props.back}>돌아가기</button>
    </section>;
  }
}

export function LazyScreen({ children, back }) {
  return <ScreenLoadError back={back}>
    <Suspense fallback={<div className="screen-load-state" role="status" aria-live="polite">불러오는 중…</div>}>
      {children}
    </Suspense>
  </ScreenLoadError>;
}
