import { Volume2, VolumeX, Vibrate, Bell, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NotificationSettings({
  soundEnabled,
  setSoundEnabled,
  vibrationEnabled,
  setVibrationEnabled,
  alertTimes,
  setAlertTimes,
  onTestSound,
  onTestVibration,
  overtimeAlertEnabled,
  setOvertimeAlertEnabled,
}) {
  return (
    <Card className="border-zinc-100 shadow-sm" data-testid="notification-settings-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-sm text-zinc-700 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Configuración de Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-green-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              )}
              <Label htmlFor="sound" className="text-sm">Sonido</Label>
            </div>
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              data-testid="sound-toggle"
            />
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className={`w-4 h-4 ${vibrationEnabled ? 'text-green-600' : 'text-zinc-400'}`} />
              <Label htmlFor="vibration" className="text-sm">Vibración</Label>
            </div>
            <Switch
              id="vibration"
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
              data-testid="vibration-toggle"
            />
          </div>

          {/* Overtime Alert Toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-100">
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${overtimeAlertEnabled ? 'text-orange-600' : 'text-zinc-400'}`} />
              <div>
                <Label htmlFor="overtime" className="text-sm">Alerta exceso de tiempo</Label>
                <p className="text-[10px] text-zinc-500">Avisa si excedes el tiempo del párrafo</p>
              </div>
            </div>
            <Switch
              id="overtime"
              checked={overtimeAlertEnabled}
              onCheckedChange={setOvertimeAlertEnabled}
              data-testid="overtime-alert-toggle"
            />
          </div>

          {/* Alert Times */}
          <div className="space-y-3">
            <Label className="text-xs text-zinc-500">Alertas antes de preguntas de repaso</Label>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">1er aviso:</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={alertTimes.firstAlert}
                onChange={(e) => setAlertTimes(prev => ({ ...prev, firstAlert: parseInt(e.target.value) || 5 }))}
                className="w-16 h-8 text-sm"
                data-testid="first-alert-input"
              />
              <span className="text-xs text-zinc-500">min</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">2do aviso:</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={alertTimes.secondAlert}
                onChange={(e) => setAlertTimes(prev => ({ ...prev, secondAlert: parseInt(e.target.value) || 1 }))}
                className="w-16 h-8 text-sm"
                data-testid="second-alert-input"
              />
              <span className="text-xs text-zinc-500">min</span>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTestSound}
              disabled={!soundEnabled}
              className="flex-1 text-xs"
              data-testid="test-sound-btn"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              Probar sonido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onTestVibration}
              disabled={!vibrationEnabled}
              className="flex-1 text-xs"
              data-testid="test-vibration-btn"
            >
              <Vibrate className="w-3 h-3 mr-1" />
              Probar vibración
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
