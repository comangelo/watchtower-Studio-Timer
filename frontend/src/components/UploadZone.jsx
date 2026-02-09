import { Upload, Clock, MessageCircleQuestion } from "lucide-react";

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="font-heading font-extrabold text-4xl md:text-5xl text-purple-700 tracking-tight mb-4">
          ATALAYA DE ESTUDIO
        </h2>
        <p className="text-lg text-slate-700 max-w-md mx-auto leading-relaxed">
          Calculadora de Tiempo de conducción
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onClick={handleClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          cursor-pointer border-2 border-dashed rounded-3xl p-12 md:p-16 text-center
          transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-orange-500 bg-orange-50 scale-[1.02] shadow-xl shadow-orange-100' 
            : 'border-slate-300 bg-slate-50/50 hover:border-orange-400 hover:bg-white hover:shadow-lg'
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
        
        {/* Icon */}
        <div className={`
          w-24 h-24 mx-auto mb-8 rounded-2xl flex items-center justify-center
          transition-all duration-300
          ${isDragging ? 'bg-orange-500 rotate-6' : 'bg-slate-200'}
        `}>
          <Upload className={`w-12 h-12 transition-colors ${isDragging ? 'text-white' : 'text-slate-500'}`} />
        </div>
        
        {/* Text */}
        <p className="font-heading font-bold text-2xl text-slate-800 mb-2">
          {isLoading ? 'Analizando documento...' : 'Arrastra el artículo de estudio en PDF aquí'}
        </p>
        <p className="text-slate-500 text-lg">
          o haz clic para seleccionar un archivo
        </p>
        
        {/* Features Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-slate-600 font-medium">180 palabras/min</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
            <MessageCircleQuestion className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-slate-600 font-medium">35 seg/respuesta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
