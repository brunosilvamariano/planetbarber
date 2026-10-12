import { CalendarDays, Check, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
export function AuthVisual({ master }: { master: boolean }) {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <div className="visual-glow" />
      <div className="visual-floating floating-top">
        <span>
          <ShieldCheck size={16} />
        </span>
        <div>
          <b>Seu espaço. Seus dados.</b>
          <small>Acesso seguro e individual</small>
        </div>
        <Check size={14} />
      </div>
      <div className="visual-window">
        <div className="visual-window-top">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>{master ? 'Seu negócio, em perspectiva' : 'Uma experiência feita para você'}</span>
          <Sparkles size={14} />
        </div>
        <div className="visual-window-body">
          <div className="visual-icon">
            <Scissors size={28} />
          </div>
          <span className="visual-overline">CUIDADO EM CADA DETALHE</span>
          <h3>
            {master ? (
              <>
                Grandes negócios.
                <br />
                Começam aqui.
              </>
            ) : (
              <>
                Seu tempo.
                <br />
                Bem cuidado.
              </>
            )}
          </h3>
          <div className="visual-lines">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="visual-window-bottom">
            <span>
              <i />
              Tudo no seu ritmo
            </span>
            <CalendarDays size={18} />
          </div>
        </div>
      </div>
      <div className="visual-floating floating-bottom">
        <span>
          <CalendarDays size={17} />
        </span>
        <div>
          <b>Mais clareza. Mais possibilidades.</b>
          <small>Uma nova forma de organizar o dia</small>
        </div>
      </div>
    </div>
  );
}
