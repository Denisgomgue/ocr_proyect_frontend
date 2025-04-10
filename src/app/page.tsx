'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

interface PreviewFile {
  name: string;
  type: string;
  size: string;
  preview: string;
}

interface DocumentItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

interface DocumentResponse {
  data: {
    extractedData: {
      tipo_documento: string;
      numero: string | null;
      fecha_emision: string | null;
      emisor: {
        ruc: string | null;
        razon_social: string;
      };
      cliente: {
        nombre: string | null;
        documento: {
          tipo: string | null;
          numero: string | null;
        } | null;
      };
      items: DocumentItem[];
      totales: {
        subtotal: number | null;
        igv: number | null;
        total: number | null;
      };
    };
    confidence: number;
    rawText: string;
  };
}

interface ApiError {
  response?: {
    data?: {
      message: string;
    };
  };
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<PreviewFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DocumentResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: formatBytes(file.size),
        preview: reader.result as string,
      });
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const activateCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      alert('No se pudo acceder a la cámara');
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captura.jpg', { type: 'image/jpeg' });
            handleFileSelect(file);
          }
        }, 'image/jpeg');
      }
      // Detener la cámara
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const processDocument = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      const formData = new FormData();
      // Convertir base64 a blob
      const response = await fetch(selectedFile.preview);
      const blob = await response.blob();
      formData.append('file', blob, selectedFile.name);

      const result = await axios.post('http://localhost:3001/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (result.data.status === 'error') {
        throw new Error(result.data.message);
      }

      setResult(result.data);
    } catch (error) {
      console.error('Error al procesar el documento:', error);
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al procesar el documento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1b26] text-white p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-[#7aa2f7]">
        Lector de Comprobantes de Pago
      </h1>

      <div className="max-w-4xl mx-auto bg-[#24283b] rounded-lg p-8 shadow-xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Capturar o Subir Comprobante</h2>

          <div className="mb-4">
            <p className="text-gray-300 mb-2">Seleccionar método de entrada:</p>
            <div className="flex gap-4">
              <button
                onClick={activateCamera}
                className="flex items-center gap-2 bg-[#7aa2f7] text-white px-6 py-2 rounded-lg hover:bg-[#6a8ee6] transition-colors"
                disabled={isCameraActive}
              >
                <span className="material-icons">camera_alt</span>
                Cámara
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-[#7aa2f7] text-white px-6 py-2 rounded-lg hover:bg-[#6a8ee6] transition-colors"
              >
                <span className="material-icons">upload_file</span>
                Subir Archivo
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />

          {isCameraActive && (
            <div className="relative mt-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-2xl mx-auto rounded-lg"
              />
              <button
                onClick={captureImage}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#7aa2f7] text-white px-6 py-2 rounded-lg hover:bg-[#6a8ee6] transition-colors"
              >
                Capturar
              </button>
            </div>
          )}

          {selectedFile && (
            <div className="mt-6 p-4 bg-[#1a1b26] rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    Formato: {selectedFile.type} - Tamaño: {selectedFile.size}
                  </p>
                </div>
                <button
                  onClick={processDocument}
                  disabled={isProcessing}
                  className="bg-[#7aa2f7] text-white px-6 py-2 rounded-lg hover:bg-[#6a8ee6] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Procesar Documento'}
                </button>
              </div>
              {selectedFile.type.startsWith('image/') && (
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-2">Vista previa:</p>
                  <img
                    src={selectedFile.preview}
                    alt="Vista previa"
                    className="max-w-2xl mx-auto rounded-lg border border-gray-700"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8 p-4 bg-[#1a1b26] rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Resultado del Procesamiento:</h3>

            {result.data?.extractedData && (
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Información Extraída:</h4>

                <div className="bg-[#24283b] p-4 rounded-lg mb-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Información del Documento</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Tipo:</p>
                      <p className="text-white">{result.data.extractedData.tipo_documento}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Número:</p>
                      <p className="text-white">{result.data.extractedData.numero || 'No detectado'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fecha de Emisión:</p>
                      <p className="text-white">{result.data.extractedData.fecha_emision || 'No detectada'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#24283b] p-4 rounded-lg mb-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Información del Emisor</h5>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <p className="text-gray-400 text-sm">Razón Social:</p>
                      <p className="text-white">{result.data.extractedData.emisor.razon_social}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">RUC:</p>
                      <p className="text-white">{result.data.extractedData.emisor.ruc || 'No detectado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#24283b] p-4 rounded-lg mb-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Información del Cliente</h5>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <p className="text-gray-400 text-sm">Nombre:</p>
                      <p className="text-white">{result.data.extractedData.cliente.nombre || 'No detectado'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Documento:</p>
                      <p className="text-white">
                        {result.data.extractedData.cliente.documento ? (
                          `${result.data.extractedData.cliente.documento.tipo}: ${result.data.extractedData.cliente.documento.numero}`
                        ) : 'No detectado'}
                      </p>
                    </div>
                  </div>
                </div>

                {result.data.extractedData.items && result.data.extractedData.items.length > 0 && (
                  <div className="bg-[#24283b] p-4 rounded-lg mb-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">Items</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-400 text-sm">
                            <th className="text-left p-2">Cant.</th>
                            <th className="text-left p-2">Descripción</th>
                            <th className="text-right p-2">P.Unit</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.extractedData.items.map((item: DocumentItem, index: number) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="p-2">{item.cantidad}</td>
                              <td className="p-2">{item.descripcion}</td>
                              <td className="p-2 text-right">S/ {item.precio_unitario.toFixed(2)}</td>
                              <td className="p-2 text-right">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-[#24283b] p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Totales</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Subtotal:</p>
                      <p className="text-white">
                        {result.data.extractedData.totales.subtotal
                          ? `S/ ${result.data.extractedData.totales.subtotal.toFixed(2)}`
                          : 'No detectado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">IGV:</p>
                      <p className="text-white">
                        {result.data.extractedData.totales.igv
                          ? `S/ ${result.data.extractedData.totales.igv.toFixed(2)}`
                          : 'No aplica'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-sm">Total:</p>
                      <p className="text-white text-lg font-bold">
                        {result.data.extractedData.totales.total
                          ? `S/ ${result.data.extractedData.totales.total.toFixed(2)}`
                          : 'No detectado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-md font-medium mb-2">JSON Extraído:</h4>
              <pre className="bg-[#24283b] p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                {JSON.stringify(result.data.extractedData, null, 2)}
              </pre>
            </div>

            {result.data?.confidence && (
              <div className="mt-4">
                <p className="text-sm text-gray-400">
                  Confianza de la extracción: {result.data.confidence.toFixed(2)}%
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(result.data.extractedData, null, 2));
                  alert('JSON copiado al portapapeles');
                }}
                className="px-4 py-2 bg-[#7aa2f7] text-white rounded-lg hover:bg-[#6a8ee6] transition-colors"
              >
                Copiar JSON
              </button>
              <button
                onClick={() => {
                  alert('Los datos han sido enviados correctamente al sistema ERP.');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Enviar a ERP
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 