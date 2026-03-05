export interface UpdateBannerProps {
  onRefresh: () => void;
}

export function UpdateBanner({ onRefresh }: UpdateBannerProps) {
  return (
    <div className="pp-update-banner" role="alert">
      <span>A new version is available.</span>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}
