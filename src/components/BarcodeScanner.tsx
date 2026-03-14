import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const scannerId = "barcode-reader";

  useEffect(() => {
    const startScanner = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Explicitly request permission first to trigger browser prompt
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          // Stop the stream immediately, we just wanted the permission
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          console.warn("Initial permission request failed:", permErr);
          // Don't throw yet, let Html5Qrcode try its own way
        }

        if (!qrCodeRef.current) {
          qrCodeRef.current = new Html5Qrcode(scannerId);
        }

        if (qrCodeRef.current.isScanning) {
          isStartingRef.current = false;
          return;
        }

        const devices = await Html5Qrcode.getCameras().catch(err => {
          console.warn("getCameras failed, will try fallback:", err);
          return [];
        });

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        };

        if (devices && devices.length > 0) {
          const backCamera = devices.find(device => 
            device.label?.toLowerCase().includes('back') || 
            device.label?.toLowerCase().includes('arrière') ||
            device.label?.toLowerCase().includes('rear')
          );
          const cameraId = backCamera ? backCamera.id : devices[0].id;

          await qrCodeRef.current.start(
            cameraId,
            config,
            (decodedText) => onScan(decodedText),
            () => {}
          );
        } else {
          // Try starting with default camera if getCameras failed or returned empty
          await qrCodeRef.current.start(
            { facingMode: "environment" },
            config,
            (decodedText) => onScan(decodedText),
            () => {}
          );
        }
        setIsCameraActive(true);
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        let userFriendlyError = "Vérifiez les permissions dans votre navigateur.";
        
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied') || err.message?.includes('NotAllowedError')) {
          userFriendlyError = "L'accès à la caméra est bloqué par votre navigateur.\n\n" +
            "📱 Sur Mobile :\n" +
            "1. Cliquez sur l'icône de cadenas à gauche de l'URL.\n" +
            "2. Allez dans 'Paramètres du site'.\n" +
            "3. Autorisez la 'Caméra'.\n\n" +
            "💻 Sur Ordinateur :\n" +
            "1. Cliquez sur le cadenas à gauche de l'adresse.\n" +
            "2. Activez l'interrupteur 'Caméra'.\n" +
            "3. Actualisez la page.";
        } else if (err.name === 'NotFoundError') {
          userFriendlyError = "Aucune caméra n'a été trouvée sur cet appareil.";
        } else if (err.message) {
          userFriendlyError = err.message;
        }

        setError(`Erreur caméra: ${userFriendlyError}`);
      } finally {
        isStartingRef.current = false;
      }
    };

    startScanner();

    return () => {
      const stopScanner = async () => {
        if (qrCodeRef.current && qrCodeRef.current.isScanning) {
          try {
            await qrCodeRef.current.stop();
            await qrCodeRef.current.clear();
          } catch (err) {
            console.error("Failed to stop scanner", err);
          }
        }
      };
      stopScanner();
    };
  }, [onScan, retryCount]); // Now safe with memoized onScan and retryCount

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="text-emerald-600" size={20} />
            <h3 className="font-bold text-slate-800">Scanner un code-barres</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="relative aspect-square w-full bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200">
            <div id={scannerId} className="w-full h-full"></div>
            
            {!isCameraActive && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/50">
                <RefreshCw className="animate-spin mb-2" size={32} />
                <p className="text-sm">Initialisation de la caméra...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 p-6 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <Camera className="text-red-500" size={32} />
                </div>
                <p className="font-bold mb-2 text-lg">Accès Caméra Refusé</p>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed whitespace-pre-line">
                  {error.replace('Erreur caméra: ', '')}
                </p>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6 flex items-start gap-2 text-left">
                  <RefreshCw className="text-amber-500 mt-0.5 flex-shrink-0" size={14} />
                  <p className="text-[10px] text-amber-200">
                    <strong>Astuce :</strong> Si vous avez déjà autorisé la caméra mais que cela ne fonctionne toujours pas, essayez de fermer tous les autres onglets ou applications qui pourraient utiliser la caméra.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-2">
                  <button 
                    onClick={() => {
                      setError(null);
                      setIsCameraActive(false);
                      setRetryCount(prev => prev + 1);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Réessayer
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-900/40">
                <div className="w-full h-full border-2 border-emerald-500 rounded-lg relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-500/50 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-700">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Camera size={16} />
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Placez le code-barres au centre du cadre. Le produit sera automatiquement ajouté à votre panier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
