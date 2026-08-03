/**
 * Fase 0 — página de prueba con marcado W3CRM original (cards, tablas, botones
 * y badges de la plantilla) para comprobar que Bootstrap 5 renderiza bien bajo
 * Next 15 + React 19. Sin datos reales ni llamadas a API.
 */
"use client";

import { Dropdown } from "react-bootstrap";

export default function W3crmPreviewPage() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Card W3CRM</h4>
              <p className="mb-0">Marcado original de la plantilla, sin modificar.</p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Botones</h4>
              <button type="button" className="btn btn-primary me-2">Primary</button>
              <button type="button" className="btn btn-secondary">Secondary</button>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Badges</h4>
              <span className="badge badge-primary me-1">Primary</span>
              <span className="badge badge-success me-1">Success</span>
              <span className="badge badge-danger">Danger</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Dropdown (react-bootstrap)</h4>
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="w3crm-dd">Acciones</Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item href="#/a">Editar</Dropdown.Item>
                  <Dropdown.Item href="#/b">Duplicar</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>

        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Tabla</h4>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-responsive-md">
                  <thead>
                    <tr>
                      <th><strong>#</strong></th>
                      <th><strong>Módulo</strong></th>
                      <th><strong>Estado</strong></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>01</strong></td>
                      <td>Shell W3CRM</td>
                      <td><span className="badge badge-success">Renderiza</span></td>
                    </tr>
                    <tr>
                      <td><strong>02</strong></td>
                      <td>react-bootstrap sobre React 19</td>
                      <td><span className="badge badge-success">Renderiza</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
