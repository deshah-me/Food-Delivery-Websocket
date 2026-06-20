function TopBanner({ message, tone = 'success' }) {
  if (!message) {
    return null;
  }

  return (
    <div className="banner-region" data-testid="top-banner">
      <div className={`top-banner ${tone}`} role="status">
        {message}
      </div>
    </div>
  );
}

export default TopBanner;
