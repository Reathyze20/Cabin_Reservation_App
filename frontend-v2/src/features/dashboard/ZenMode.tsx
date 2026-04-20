import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import apiClient from '@/api/client';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getNetworkAwareActionMessage, getNetworkAwareLoadMessage } from '@/lib/networkError';
import './ZenMode.css';

interface Wallpaper {
    id: string;
    url: string;
}

export function ZenMode() {
    const [isZenMode, setIsZenMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [deleteWallpaperConfirmOpen, setDeleteWallpaperConfirmOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const {
        data: wallpapers = [],
        isError: wallpapersFailed,
        error: wallpapersError,
        refetch: refetchWallpapers,
    } = useQuery<Wallpaper[]>({
        queryKey: ['wallpapers'],
        queryFn: async () => {
            const res = await apiClient.get<Wallpaper[]>('/wallpapers');
            return res.data;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('image', file);
            const res = await apiClient.post('/wallpapers', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
            setUploadError(null);
            showToast('Tapeta nahrána', 'success');
        },
        onError: (error) => {
            setUploadError(
                getNetworkAwareActionMessage(
                    error,
                    'Tapetu se nepodařilo nahrát. Zkuste to znovu.',
                    'Spojení vypadlo dřív, než se tapeta stihla nahrát. Zkuste to znovu po obnovení připojení.',
                ),
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/wallpapers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
            setDeleteError(null);
            setDeleteWallpaperConfirmOpen(false);
            showToast('Tapeta smazána', 'success');
            setCurrentIndex((prev) => Math.max(0, prev - 1));
        },
        onError: (error) => {
            setDeleteError(
                getNetworkAwareActionMessage(
                    error,
                    'Tapetu se nepodařilo smazat. Zkuste to znovu.',
                    'Spojení vypadlo dřív, než se tapeta stihla smazat. Zkuste to znovu po obnovení připojení.',
                ),
            );
        },
    });

    useEffect(() => {
        if (isZenMode) {
            document.body.classList.add('zen-mode-active');
        } else {
            document.body.classList.remove('zen-mode-active');
        }
        return () => document.body.classList.remove('zen-mode-active');
    }, [isZenMode]);

    const rawItems = [{ id: 'default', url: '/bg-hero.jpg' }, ...wallpapers];
    const items = rawItems.filter(img => img && img.url && img.url.trim() !== '');

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => {
            const maxIndex = items.length - 1;
            return prev < maxIndex ? prev + 1 : prev;
        });
    }, [items.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isZenMode) return;
            if (e.key === 'Escape') setIsZenMode(false);
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isZenMode, handleNext, handlePrev]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('Soubor je příliš velký (max 20MB)', 'error');
            return;
        }
        setUploadError(null);
        uploadMutation.mutate(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSetBackground = () => {
        const safeIndex = Math.min(currentIndex, items.length - 1);
        const bgUrl = items[safeIndex]?.url;
        if (bgUrl) {
            localStorage.setItem('app-background', bgUrl);
            document.documentElement.style.setProperty('--bg-image', `url("${bgUrl}")`);
            showToast('Pozadí aplikace bylo změněno', 'success');
        }
    };

    useLayoutEffect(() => {
        const updateSliderOffset = () => {
            if (!trackRef.current || items.length === 0) return;
            const track = trackRef.current;
            const slides = Array.from(track.querySelectorAll('.slide'));
            if (!slides || slides.length === 0) return;

            const safeIndex = Math.min(currentIndex, slides.length - 1);
            const activeSlide = slides[safeIndex] as HTMLElement;
            if (!activeSlide) return;

            const viewport = track.parentElement;
            if (!viewport) return;

            const slideWidth = activeSlide.offsetWidth;
            const gapStr = window.getComputedStyle(track).gap;
            const gap = parseInt(gapStr) || 24;

            let translateX = -(currentIndex * (slideWidth + gap));
            translateX += (viewport.offsetWidth / 2) - (slideWidth / 2);

            track.style.transform = `translateX(${translateX}px)`;
        };

        if (isZenMode) {
            updateSliderOffset();
            const timer = setTimeout(updateSliderOffset, 100);
            window.addEventListener('resize', updateSliderOffset);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateSliderOffset);
            };
        }
    }, [isZenMode, currentIndex, items.length]);

    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (diff > 50) handleNext();
        else if (diff < -50) handlePrev();
        touchStartX.current = null;
    };

    const toggleBtn = (
        <button
            className="zen-mode-toggle shadow-md"
            onClick={() => setIsZenMode(true)}
            title="Aktivovat Kino Mód"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
        </button>
    );

    const safeIndex = Math.min(currentIndex, items.length - 1);
    const activeItem = items[safeIndex];
    const canSetBg = activeItem && activeItem.id !== 'default' && activeItem.id !== 'default1' && activeItem.id !== 'default2';
    const loadError = wallpapersFailed
        ? getNetworkAwareLoadMessage(wallpapersError, 'Vlastní tapety se nepodařilo načíst. Zkuste to znovu.')
        : null;

    const overlay = (
        <div className="zen-overlay" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="action-pill">
                {user?.role !== 'guest' && (
                    <>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn-action"
                            id="btn-upload"
                            onClick={() => fileInputRef.current?.click()}
                            title="Nahrát vlastní tapetu"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                        <button
                            className="btn-action success"
                            id="btn-set-bg"
                            onClick={handleSetBackground}
                            title="Nastavit jako pozadí aplikace"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </button>
                        {wallpapers.length > 0 && canSetBg && (
                            <button
                                className="btn-action danger"
                                id="btn-delete"
                                onClick={() => {
                                    setDeleteError(null);
                                    setDeleteWallpaperConfirmOpen(true);
                                }}
                                disabled={deleteMutation.isPending}
                                title="Smazat tapetu"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        )}
                        <div className="divider"></div>
                    </>
                )}
                <button
                    className="btn-action"
                    id="btn-close-zen"
                    onClick={() => setIsZenMode(false)}
                    title="Zavřít"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <button
                className="nav-arrow left"
                id="nav-prev"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{ display: items.length <= 1 ? 'none' : 'flex' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <button
                className="nav-arrow right"
                id="nav-next"
                onClick={handleNext}
                disabled={currentIndex >= items.length - 1}
                style={{ display: items.length <= 1 ? 'none' : 'flex' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <div className="slider-viewport" style={{ display: items.length === 0 ? 'none' : 'block' }}>
                <div
                    className="slider-track"
                    id="slider-track"
                    ref={trackRef}
                >
                    {items.map((item, i) => (
                        <img
                            key={item.id}
                            src={item.url}
                            className={`slide ${i === currentIndex ? 'active' : ''}`}
                            alt="Wallpaper"
                            onClick={() => setCurrentIndex(i)}
                        />
                    ))}
                </div>
            </div>

            {(loadError || uploadError || deleteError) && (
                <div
                    style={{
                        position: 'absolute',
                        top: 84,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        width: 'min(560px, calc(100vw - 32px))',
                        padding: '10px 14px',
                        borderRadius: 16,
                        background: 'rgba(17, 24, 39, 0.82)',
                        border: '1px solid rgba(248, 113, 113, 0.38)',
                        color: '#fecaca',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                    role="alert"
                >
                    <span style={{ flex: '1 1 240px', minWidth: 0 }}>
                        {uploadError ?? deleteError ?? loadError}
                    </span>
                    {loadError && !uploadError && !deleteError ? (
                        <button
                            type="button"
                            className="button-secondary"
                            style={{ flex: '0 0 auto', minHeight: 44 }}
                            onClick={() => {
                                void refetchWallpapers();
                            }}
                        >
                            Zkusit znovu
                        </button>
                    ) : null}
                </div>
            )}

            {uploadMutation.isPending && (
                <div style={{ position: 'absolute', top: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 16px', borderRadius: 20, zIndex: 1000 }}>
                    Nahrávám...
                </div>
            )}
        </div>
    );

    return (
        <>
            <ConfirmDialog
                isOpen={deleteWallpaperConfirmOpen}
                title="Smazat tapetu"
                message="Opravdu chcete smazat tuto tapetu?"
                confirmLabel="Smazat"
                danger
                loading={deleteMutation.isPending}
                errorMessage={deleteError}
                onConfirm={() => {
                    if (!activeItem || activeItem.id === 'default') return;
                    deleteMutation.mutate(activeItem.id);
                }}
                onCancel={() => {
                    setDeleteWallpaperConfirmOpen(false);
                    setDeleteError(null);
                }}
            />
            {createPortal(toggleBtn, document.body)}
            {isZenMode && createPortal(overlay, document.body)}
        </>
    );
}
