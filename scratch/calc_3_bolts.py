import math

def calc_3_bolts():
    d_b = 22.0  # mm
    d_h = 24.0  # mm
    A_b = math.pi * (d_b / 2)**2 # 380.1 mm^2
    m = 2 # double shear
    t_w = 10.0 # mm
    t_p = 8.0 # mm (2 plates = 16 mm)
    
    # User's current layout
    s_user = 80.0
    ev_user = 22.0
    h_p_user = 203.0 # or 204.0
    eh_user = 45.0
    
    # 3 bolts on a single line:
    # y = +80, 0, -80
    # sum(y^2) = 80^2 + 0^2 + (-80)^2 = 12800 mm^2
    # e = 45 mm (shear eccentricity)
    # M = V * 45
    # For top/bottom bolt (y = 80):
    # F_hx = M * 80 / 12800 = 45 * 80 / 12800 * V = 0.28125 V
    # F_vy = V / 3 = 0.33333 V
    # R_crit = sqrt(0.28125^2 + 0.33333^2) * V = sqrt(0.0791 + 0.1111) * V = 0.43615 V
    # C = 1 / 0.43615 = 2.293 (Effective number of bolts)
    
    C_3 = 1.0 / math.sqrt((45.0 * 80.0 / 12800.0)**2 + (1.0/3.0)**2)
    print(f"3 顆螺栓單排 (s=80, e=45): 偏心折減有效係數 C = {C_3:.3f} (無偏心為 3.0)")
    
    # Materials
    for grade, Fy, Fu in [("SN490B / SM490", 325, 490), ("SS400 / A36", 240, 400)]:
        print(f"\n==================== 材質: {grade} ====================")
        Vp = 0.6 * Fy * 3000 / 1000.0 # kN
        phi_Vn = 0.9 * Vp # kN
        print(f"次梁腹板全剪力 phi*Vn = {phi_Vn:.1f} kN ({phi_Vn/9.81:.1f} tf)")
        print(f"50% 剪力要求 = {0.5*phi_Vn:.1f} kN ({0.5*phi_Vn/9.81:.1f} tf)")
        
        # 摩阻型 M22 F10T 雙剪
        T0 = 205.0
        phi_slip_double = 1.0 * 0.35 * 1.13 * 1.0 * T0 * 2.0 # 162.2 kN (16.5 tf)
        phi_V_slip = C_3 * phi_slip_double
        print(f"\n[摩阻型接合容量]")
        print(f"  單顆雙剪強度 phi*Rn = {phi_slip_double:.1f} kN ({phi_slip_double/9.81:.1f} tf)")
        print(f"  考慮偏心總剪力容量 phi*V = {phi_V_slip:.1f} kN ({phi_V_slip/9.81:.1f} tf)")
        print(f"  佔梁腹板全剪力比例: {phi_V_slip / phi_Vn * 100:.1f}%")
        print(f"  達到 50% 要求? -> {'符合 (OK)' if phi_V_slip >= 0.5 * phi_Vn else '不足'}")
        
        # 承壓面檢核
        # 1. 使用者目前 ev = 22 mm:
        Lc_user_edge = ev_user - d_h / 2.0 # 22 - 12 = 10 mm!!
        Lc_user_int = s_user - d_h # 80 - 24 = 56 mm
        Rn_edge_user = min(1.2 * Lc_user_edge * t_w * Fu / 1000.0, 2.4 * d_b * t_w * Fu / 1000.0)
        Rn_int_user = min(1.2 * Lc_user_int * t_w * Fu / 1000.0, 2.4 * d_b * t_w * Fu / 1000.0)
        print(f"\n[使用者目前配法: ev = 22 mm, s = 80 mm]")
        print(f"  淨端距 Lc = {Lc_user_edge:.1f} mm (非常危險！僅 10 mm)")
        print(f"  外緣孔承壓強度 phi*Rn = {0.75 * Rn_edge_user:.1f} kN ({0.75*Rn_edge_user/9.81:.1f} tf)")
        print(f"  內孔承壓強度 phi*Rn = {0.75 * Rn_int_user:.1f} kN ({0.75*Rn_int_user/9.81:.1f} tf)")
        
        # 2. 建議標準配法: ev = 35 mm, s = 80 mm (板高 Hp = 35 + 80*2 + 35 = 230 mm):
        ev_rec = 35.0
        Lc_rec_edge = ev_rec - d_h / 2.0 # 35 - 12 = 23 mm
        Rn_edge_rec = min(1.2 * Lc_rec_edge * t_w * Fu / 1000.0, 2.4 * d_b * t_w * Fu / 1000.0)
        print(f"\n[建議標準配法: ev = 35 mm, s = 80 mm, 板高 230 mm]")
        print(f"  淨端距 Lc = {Lc_rec_edge:.1f} mm (合乎規範要求)")
        print(f"  外緣孔承壓強度 phi*Rn = {0.75 * Rn_edge_rec:.1f} kN ({0.75*Rn_edge_rec/9.81:.1f} tf)")
        
        # 塊狀剪力檢核 (Block Shear for 3 bolts, s=80, ev=35 or 22)
        for ev, name in [(22.0, "ev=22mm"), (35.0, "ev=35mm")]:
            Avg = (ev + 2 * s_user) * t_w # (ev + 160) * 10
            Avn = (Avg - 2.5 * d_h * t_w) # (ev + 160 - 60) * 10
            Atg = eh_user * t_w # 45 * 10 = 450
            Atn = (eh_user - 0.5 * d_h) * t_w # (45 - 12) * 10 = 330
            Rn_bs1 = (0.6 * Fu * Avn + 1.0 * Fu * Atn) / 1000.0
            Rn_bs2 = (0.6 * Fy * Avg + 1.0 * Fu * Atn) / 1000.0
            phi_Rn_bs = 0.75 * min(Rn_bs1, Rn_bs2)
            print(f"  塊狀剪力 ({name}): phi*Rn = {phi_Rn_bs:.1f} kN ({phi_Rn_bs/9.81:.1f} tf)")

calc_3_bolts()
