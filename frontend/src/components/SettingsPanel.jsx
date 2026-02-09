import { Clock, MessageCircleQuestion, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export function SettingsPanel({ 
  readingSpeed, 
  setReadingSpeed, 
  answerTime, 
  setAnswerTime 
}) {
  const speedOptions = [
    { value: 150, label: "Lento", description: "150 palabras/min" },
    { value: 180, label: "Normal", description: "180 palabras/min" },
    { value: 210, label: "Rápido", description: "210 palabras/min" }
  ];

  return (
    <Card className="mb-8 border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">Configuración de tiempos</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Velocidad de lectura */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-slate-700">Velocidad de lectura</span>
            </div>
            <div className="flex gap-2">
              {speedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReadingSpeed(option.value)}
                  className={`flex-1 py-3 px-4 rounded-xl text-center transition-all ${
                    readingSpeed === option.value
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid={`speed-${option.value}`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`block text-xs mt-1 ${readingSpeed === option.value ? 'text-orange-100' : 'text-slate-400'}`}>
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Tiempo por respuesta */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-slate-700">Tiempo por respuesta</span>
              </div>
              <span className="text-lg font-bold text-orange-500" style={{ fontFamily: 'system-ui' }}>
                {answerTime} seg
              </span>
            </div>
            <Slider
              value={[answerTime]}
              onValueChange={(value) => setAnswerTime(value[0])}
              min={15}
              max={90}
              step={5}
              className="w-full"
              data-testid="answer-time-slider"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>15 seg</span>
              <span>90 seg</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
