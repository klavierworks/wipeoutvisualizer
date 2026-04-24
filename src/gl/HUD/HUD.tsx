import { useEffect, useRef, useState } from 'react';
import styles from './HUD.module.css';
import { audioState } from '../../audio/state';
import type { BuiltExtras } from '../../constructor';
import type { DecodedImage } from '../../reader-bridge';

type HUDProps = {
  extras: BuiltExtras | null;
};

const AtlasImage = ({ image }: { image: DecodedImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(image.width, image.height);
    imageData.data.set(image.rgba);
    ctx.putImageData(imageData, 0, 0);
  }, [image]);
  return (
    <canvas
      ref={canvasRef}
      width={image.width}
      height={image.height}
      className={styles.atlasImage}
    />
  );
};

const AtlasRow = ({ label, images }: { label: string; images: DecodedImage[] | undefined }) => {
  if (!images || images.length === 0) return null;
  return (
    <div className={styles.atlasRow}>
      <div className={styles.atlasLabel}>{label}</div>
      <div className={styles.atlasImages}>
        {images.map((img, i) => (
          <AtlasImage key={i} image={img} />
        ))}
      </div>
    </div>
  );
};

// M:SS.t — minutes, zero-padded seconds, one decimal of a second.
const formatRemaining = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const tenths = Math.floor(safe * 10);
  const m = Math.floor(tenths / 600);
  const s = Math.floor(tenths / 10) % 60;
  const t = tenths % 10;
  return `${m}:${String(s).padStart(2, '0')}.${t}`;
};

const HUD = ({ extras }: HUDProps) => {
  const [tempo, setTempo] = useState<number>(0);
  const [currentAudioState, setCurrentAudioState] = useState(audioState);
  const [sectionRemaining, setSectionRemaining] = useState<string>('0:00.0');
  const [trackRemaining, setTrackRemaining] = useState<string>('0:00.0');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setTempo(Math.round(audioState.bpm));
      const section = audioState.sections[audioState.sectionIndex];
      const sectionLeft = section ? section.duration - audioState.sectionTime : 0;
      setSectionRemaining(formatRemaining(sectionLeft));
      setTrackRemaining(formatRemaining(audioState.duration - audioState.time));
      setCurrentAudioState(audioState);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    }
  }, []);

  return (
    <div className={styles.hud}>
      <div className={styles.positions}>{Object.entries(currentAudioState).map(([key, value]) => key !== 'sections' && (
        <div key={key}>
          <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(2) : String(value)}
        </div>
      ))}</div>
      <div className={styles.check}>
        {'Check'}
        <div className={styles.time}>{sectionRemaining}</div>
      </div>
      <div className={styles.remaining}>
        <div className={styles.time}>{trackRemaining}</div>
      </div>
      <div className={styles.speed}>
        {tempo ?? 0}
        <div className={styles.bpm}>bpm</div>
      </div>
      <div className={styles.atlases} style={{display: 'none'}}>
        <AtlasRow label="HUD icons" images={extras?.atlases.hudIcons} />
        <AtlasRow label="Pickup icons" images={extras?.atlases.pickupIcons} />
        <AtlasRow label="Effects" images={extras?.atlases.effects} />
        <AtlasRow label="Fonts" images={extras?.atlases.fonts} />
      </div>
    </div>
  );
}

export default HUD;
