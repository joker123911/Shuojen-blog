# Structural Calculation for Beam Shear Connection
# Girder: 600 x 440 x 12 x 32
# Beam: 300 x 300 x 10 x 15
# Plate: 2 - PL 8 x 190 x 170 (or 410)
# Bolts: M22 (F10T)

import math

def run_calc():
    d_b = 22.0  # mm
    d_h = 24.0  # mm (standard hole)
    A_b = math.pi * (d_b / 2)**2  # mm^2
    m = 2  # double shear
    
    # Beam web
    t_w = 10.0  # mm
    d_beam = 300.0  # mm
    
    # Plate
    t_p = 8.0  # mm
    total_t_p = 2 * t_p  # 16 mm
    h_p = 170.0  # mm (from 45 + 80 + 45)
    
    # Spacing
    s = 80.0  # vertical pitch mm
    e_v = 45.0 # vertical edge distance mm
    e_h = 45.0 # horizontal edge distance mm
    
    # Materials: check both SN490 and SS400
    for grade, Fy, Fu in [("SN490 / SM490 (常用建築鋼材)", 325, 490), ("SS400 / A36 (一般結構鋼)", 240, 400)]:
        print(f"==================================================")
        print(f"鋼材材質: {grade}")
        print(f"  Fy = {Fy} MPa, Fu = {Fu} MPa")
        print(f"==================================================")
        
        # 1. 梁腹板剪力容量
        Aw = d_beam * t_w # 3000 mm^2
        Vn_web_yield = 0.6 * Fy * Aw / 1000.0 # kN
        phi_Vn_web = 0.9 * Vn_web_yield # LRFD kN
        Va_web_asd = Vn_web_yield / 1.5 # ASD kN
        print(f"次梁腹板塑性剪力容量 Vp = {Vn_web_yield:.1f} kN ({Vn_web_yield/9.81:.1f} tf)")
        print(f"  LRFD 設計剪力強度 phi*Vn = {phi_Vn_web:.1f} kN ({phi_Vn_web/9.81:.1f} tf)")
        print(f"  ASD  容許剪力強度 Va = {Va_web_asd:.1f} kN ({Va_web_asd/9.81:.1f} tf)")
        print(f"  規範半強度要求 (50% Vp) = {0.5*Vn_web_yield:.1f} kN ({0.5*Vn_web_yield/9.81:.1f} tf)")
        print(f"  規範半強度 LRFD (50% phi*Vn) = {0.5*phi_Vn_web:.1f} kN ({0.5*phi_Vn_web/9.81:.1f} tf)")
        print(f"  規範半強度 ASD  (50% Va) = {0.5*Va_web_asd:.1f} kN ({0.5*Va_web_asd/9.81:.1f} tf)")
        print()
        
        # 2. 螺栓剪力容量 (M22 F10T)
        # F10T: Fu_bolt = 1000 MPa, 最小拉力 T0 = 205 kN
        T0 = 205.0 # kN
        mu = 0.35 # Class A contact surface
        # 摩阻型 (Slip-Critical)
        # LRFD: phi = 1.0 (標準孔), phi * Rn = phi * mu * Du * hsc * Tb * Ns
        Du = 1.13
        hsc = 1.0
        phi_slip_per_plane = 1.0 * mu * Du * hsc * T0 # kN
        phi_slip_double = phi_slip_per_plane * m # kN per bolt
        # ASD: qa = 4.5 ~ 5.0 tf per plane -> double shear ~ 9.0 ~ 10.0 tf
        qa_slip_double = 2.0 * (0.35 * T0 / 1.5) # approx ASD factor of safety 1.5 on slip
        
        # 承壓型 (Bearing type)
        # Threads included (N): Fnv = 450 MPa
        phi_bearing_shear = 0.75 * (450 * A_b * m) / 1000.0 # kN
        
        # 承壓面檢核 (Bearing on web tw=10mm)
        # Lc_edge = e_v - dh/2 = 45 - 12 = 33 mm
        # Lc_int = s - dh = 80 - 24 = 56 mm
        # Rn = 1.2 * Lc * t * Fu <= 2.4 * db * t * Fu
        Rn_edge = min(1.2 * (e_v - d_h/2) * t_w * Fu / 1000.0, 2.4 * d_b * t_w * Fu / 1000.0)
        Rn_int = min(1.2 * (s - d_h) * t_w * Fu / 1000.0, 2.4 * d_b * t_w * Fu / 1000.0)
        phi_bearing_web_edge = 0.75 * Rn_edge
        phi_bearing_web_int = 0.75 * Rn_int
        
        print(f"單顆 M22 F10T 雙剪容量:")
        print(f"  摩阻型 (Slip-Critical, 雙剪): phi*Rn = {phi_slip_double:.1f} kN ({phi_slip_double/9.81:.1f} tf)")
        print(f"  承壓型 (Bearing Shear, 雙剪): phi*Rn = {phi_bearing_shear:.1f} kN ({phi_bearing_shear/9.81:.1f} tf)")
        print(f"  腹板承壓強度 (孔邊緣): phi*Rn = {phi_bearing_web_edge:.1f} kN ({phi_bearing_web_edge/9.81:.1f} tf)")
        print(f"  腹板承壓強度 (內孔): phi*Rn = {phi_bearing_web_int:.1f} kN ({phi_bearing_web_int/9.81:.1f} tf)")
        print()
        
        # 3. 接合部整體剪力容量比較:
        for n_bolts_side in [2, 4]:
            print(f"--- 檢核：單側螺栓數 n = {n_bolts_side} 顆 (雙剪) ---")
            
            # 偏心剪力考慮 (Instantaneous Center of Rotation 或 Elastic method)
            # 螺栓偏心距 e
            # 若單排 (1 column x 2 rows): e = 45 mm (螺栓至梁端/接縫距離)
            if n_bolts_side == 2:
                # 彈性法:
                # 2 bolts: y1 = +40, y2 = -40, sum(y^2) = 2 * 40^2 = 3200 mm^2
                # V acts at e = 45 mm (shear center to bolt line)
                # M = V * e = 45 V
                # Horizontal force on bolt due to M: F_h = M * y / sum(r^2) = 45 V * 40 / 3200 = 0.5625 V
                # Vertical force on bolt: F_v = V / 2 = 0.5 V
                # Resultant force per bolt: R = sqrt(F_h^2 + F_v^2) = sqrt(0.5625^2 + 0.5^2) * V = 0.7524 V
                # Effective number of bolts C = 1 / 0.7524 = 1.329 bolts!
                C_ecc = 1.0 / math.sqrt((45.0 * 40.0 / 3200.0)**2 + 0.5**2)
            elif n_bolts_side == 4:
                # 假設 2 columns x 2 rows, horizontal spacing 80mm, vertical 80mm
                # sum(r^2) = 4 * (40^2 + 40^2) = 12800 mm^2
                # e = 45 + 40 = 85 mm
                # C approx 3.0 ~ 3.2
                C_ecc = 3.2
                
            print(f"  螺栓偏心折減有效係數 C = {C_ecc:.2f} (無偏心為 {n_bolts_side})")
            
            # 摩阻型設計剪力
            phi_V_slip = C_ecc * phi_slip_double
            print(f"  [摩阻型] 接合容許剪力 phi*V_slip = {phi_V_slip:.1f} kN ({phi_V_slip/9.81:.1f} tf)")
            
            # 承壓型設計剪力 (取剪力與承壓較小值)
            phi_r_min = min(phi_bearing_shear, (phi_bearing_web_edge + phi_bearing_web_int)/2.0 if n_bolts_side==2 else phi_bearing_web_int)
            phi_V_bearing = C_ecc * phi_r_min
            print(f"  [承壓型] 接合極限剪力 phi*V_bearing = {phi_V_bearing:.1f} kN ({phi_V_bearing/9.81:.1f} tf)")
            
            # 塊狀剪力 (Block Shear) 檢核 (for 2 bolts on web)
            if n_bolts_side == 2:
                # 沿螺栓中心線破壞
                # Shear area: Avg = (e_v + s) * tw = (45 + 80) * 10 = 1250 mm^2
                # Avn = (125 - 1.5 * dh) * tw = (125 - 36) * 10 = 890 mm^2
                # Tension area: Atg = e_h * tw = 45 * 10 = 450 mm^2 (to beam end)
                # Atn = (45 - 0.5 * dh) * tw = (45 - 12) * 10 = 330 mm^2
                # Rn = 0.6 * Fu * Avn + Ubs * Fu * Atn <= 0.6 * Fy * Avg + Ubs * Fu * Atn
                Ubs = 1.0
                Rn_bs1 = (0.6 * Fu * 890 + Ubs * Fu * 330) / 1000.0 # kN
                Rn_bs2 = (0.6 * Fy * 1250 + Ubs * Fu * 330) / 1000.0 # kN
                Rn_bs = min(Rn_bs1, Rn_bs2)
                phi_Rn_bs = 0.75 * Rn_bs
                print(f"  [腹板塊狀剪力] phi*Rn_bs = {phi_Rn_bs:.1f} kN ({phi_Rn_bs/9.81:.1f} tf)")
            
            # 檢核是否達到 50% 梁剪力容量要求
            ratio_Vp = phi_V_slip / phi_Vn_web
            print(f"  相對於梁腹板全強度 (phi*Vn) 佔比: {ratio_Vp*100:.1f}%")
            print(f"  是否達到規範一般要求的 50% phi*Vn? -> {'符合 (OK)' if ratio_Vp >= 0.5 else '未達 50% (不足)'}")
            print()

if __name__ == '__main__':
    run_calc()
