import { Upload } from "lucide-react";

export function UploadZone({ 
  onFileSelect, 
  isDragging, 
  isLoading, 
  onDragOver, 
  onDragLeave, 
  onDrop,
  fileInputRef 
}) {
  const handleClick = () => fileInputRef.current?.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="animate-in max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-zinc-900 tracking-tight mb-4">
          Analiza tu PDF
        </h2>
        <p className="text-lg text-zinc-500 max-w-md mx-auto">
          Sube un artículo y calcula el tiempo necesario para leerlo en voz alta
        </p>
      </div>

      <div
        onClick={handleClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          upload-zone cursor-pointer border-2 border-dashed rounded-2xl p-16 text-center
          ${isDragging 
            ? 'border-orange-500 bg-orange-50/30' 
            : 'border-zinc-200 hover:border-orange-500 hover:bg-orange-50/10'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        data-testid="upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-input"
        />
        
        <div className={`
          w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
          ${isDragging ? 'bg-orange-100' : 'bg-zinc-100'}
        `}>
          <Upload className={`w-10 h-10 ${isDragging ? 'text-orange-500' : 'text-zinc-400'}`} />
        </div>
        
        <p className="font-heading font-semibold text-xl text-zinc-900 mb-2">
          {isLoading ? 'Analizando...' : 'Arrastra tu PDF aquí'}
        </p>
        <p className="text-zinc-500">
          o haz clic para seleccionar un archivo
        </p>
        
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-zinc-400 rounded-full" />
            </span>
            180 palabras/min
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-zinc-400 rounded-full" />
            </span>
            35 seg/respuesta
          </div>
        </div>
      </div>
    </div>
  );
}
