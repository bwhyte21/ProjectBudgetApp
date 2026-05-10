using Microsoft.AspNetCore.Mvc;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;
using WhichToPay.Core.Persistence;

namespace WhichToPay.Api.Controllers;

[ApiController]
[Route("api/income")]
public sealed class IncomeController : ControllerBase
{
    private readonly IIncomeRepository _repo;

    public IncomeController(IIncomeRepository repo) => _repo = repo;

    [HttpGet]
    public ActionResult<IncomeDto?> Get()
    {
        var income = _repo.Get();
        return income is null ? Ok(null) : Ok(IncomeDto.From(income));
    }

    [HttpPut]
    public ActionResult<IncomeDto> Set(IncomeDto dto)
    {
        var saved = _repo.Set(new Income
        {
            PerPaycheckAmount = dto.PerPaycheckAmount,
            Frequency = dto.Frequency
        });
        return Ok(IncomeDto.From(saved));
    }
}
